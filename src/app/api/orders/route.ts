import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product, type IProduct } from "@/models/Product";
import { Customer } from "@/models/Customer";
import { Payment } from "@/models/Payment";
import type { IOrderItem } from "@/models/Order";
import { createOrderSchema } from "@/lib/validators";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-utils";
import { getPaginationParams, buildPaginationMeta, generateOrderNumber, formatCurrency, escapeRegex } from "@/lib/utils";
import { notifyNewOrder, notifyLowStock } from "@/lib/notify";
import { type OrderStatus, type PaymentStatus, type PaymentRecordStatus } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Ensure orders with pending payments default to "processing" order status
    await Order.updateMany(
      { paymentStatus: "pending", status: "pending" as any },
      { $set: { status: "processing" } }
    );

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const paymentStatus = searchParams.get("paymentStatus") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDir = searchParams.get("sortDir") === "asc" ? 1 : -1;
    const date = searchParams.get("date");
    const dateFrom = searchParams.get("dateFrom") || date;
    const dateTo = searchParams.get("dateTo") || date;
    const { page, limit, skip } = getPaginationParams(searchParams);

    const filter: Record<string, unknown> = {};
    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { orderNumber: { $regex: escaped, $options: "i" } },
        { "customerSnapshot.name": { $regex: escaped, $options: "i" } },
        { "customerSnapshot.email": { $regex: escaped, $options: "i" } },
      ];
    }
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (dateFrom || dateTo) {
      const range: Record<string, Date> = {};
      if (dateFrom) {
        const parts = dateFrom.split("-").map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
          range.$gte = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
        } else {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          range.$gte = fromDate;
        }
      }
      if (dateTo) {
        const parts = dateTo.split("-").map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
          range.$lte = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
        } else {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          range.$lte = toDate;
        }
      }
      filter.createdAt = range;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ [sortBy]: sortDir })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    return apiSuccess({ orders, meta: buildPaginationMeta(total, page, limit) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const data = createOrderSchema.parse(body);

    const customer = await Customer.findById(data.customerId);
    if (!customer) return apiError("Customer not found", 404);

    let subtotal = 0;
    const items: IOrderItem[] = [];
    const productsToUpdate: Array<{ product: IProduct; quantity: number; variantName?: string }> = [];

    for (const item of data.items) {
      const product = await Product.findById(item.productId);
      if (!product) return apiError(`Product not found: ${item.productId}`, 404);

      let unitPrice =
        product.salePrice !== undefined && product.salePrice !== null && product.salePrice > 0
          ? product.salePrice
          : product.price;
      let itemSku = product.sku;
      let matchedVariant: any = null;

      if (item.variantName && Array.isArray(product.variants) && product.variants.length > 0) {
        matchedVariant = product.variants.find(
          (v) => v.name.trim().toLowerCase() === item.variantName.trim().toLowerCase()
        );
      }

      if (matchedVariant) {
        if (matchedVariant.stock < item.quantity) {
          return apiError(
            `Insufficient stock for ${product.name} (${matchedVariant.name}). Available: ${matchedVariant.stock}`,
            400
          );
        }
        unitPrice =
          matchedVariant.salePrice !== undefined &&
          matchedVariant.salePrice !== null &&
          matchedVariant.salePrice > 0
            ? matchedVariant.salePrice
            : matchedVariant.price;
        itemSku = matchedVariant.sku || product.sku;
      } else {
        if (product.stock < item.quantity) {
          return apiError(`Insufficient stock for ${product.name}. Available: ${product.stock}`, 400);
        }
      }

      const lineSubtotal = unitPrice * item.quantity;
      subtotal += lineSubtotal;

      items.push({
        product: product._id,
        name: product.name,
        variantName: matchedVariant ? matchedVariant.name : "",
        image: product.images?.[0] || "",
        sku: itemSku,
        price: unitPrice,
        quantity: item.quantity,
        subtotal: lineSubtotal,
      });

      productsToUpdate.push({
        product,
        quantity: item.quantity,
        variantName: matchedVariant ? matchedVariant.name : undefined,
      });
    }

    const total = subtotal - data.discount + data.shippingFee + data.tax;
    const orderNumber = await generateOrderNumber();

    // Payment status:
    // - For COD: default payment status is "pending" (payment collected upon delivery)
    // - For prepaid / online: based on customer action (e.g. "paid", "failed", or "pending")
    const initialPaymentStatus: PaymentStatus =
      data.paymentStatus || "pending";

    // Order status: default is "processing"
    let initialOrderStatus: OrderStatus;
    if (data.status) {
      initialOrderStatus = data.status;
    } else {
      initialOrderStatus = "processing";
    }

    const historyNote =
      data.paymentMethod === "cod"
        ? "Order created with COD — Processing (Payment Pending)"
        : initialPaymentStatus === "paid"
        ? "Order created and paid — Processing"
        : initialPaymentStatus === "failed"
        ? "Order created — Payment Failed"
        : "Order created — Processing (Payment Pending)";

    const order = new Order({
      orderNumber,
      customer: customer._id,
      customerSnapshot: { name: customer.name, email: customer.email, phone: customer.phone },
      items,
      billingAddress: data.billingAddress,
      shippingAddress: data.shippingAddress,
      subtotal,
      discount: data.discount,
      shippingFee: data.shippingFee,
      tax: data.tax,
      total,
      paymentMethod: data.paymentMethod,
      paymentStatus: initialPaymentStatus,
      status: initialOrderStatus,
      notes: data.notes,
      statusHistory: [{ status: initialOrderStatus, changedAt: new Date(), note: historyNote }],
    });
    await order.validate();

    for (const { product, quantity, variantName } of productsToUpdate) {
      if (variantName && Array.isArray(product.variants)) {
        const v = product.variants.find(
          (varItem) => varItem.name.trim().toLowerCase() === variantName.trim().toLowerCase()
        );
        if (v) {
          v.stock = Math.max(0, v.stock - quantity);
        }
      }
      product.stock = Math.max(0, product.stock - quantity);
      product.totalSold = (product.totalSold || 0) + quantity;
      await product.save();
      if (product.stock <= product.lowStockThreshold) {
        await notifyLowStock({ _id: product._id, name: product.name, stock: product.stock });
      }
    }

    await order.save();

    const paymentRecordStatus: PaymentRecordStatus =
      initialPaymentStatus === "paid"
        ? "completed"
        : initialPaymentStatus === "failed"
        ? "failed"
        : initialPaymentStatus === "refunded"
        ? "refunded"
        : "pending";

    await Payment.create({
      order: order._id,
      orderNumber: order.orderNumber,
      customer: customer._id,
      amount: total,
      method: data.paymentMethod,
      status: paymentRecordStatus,
      gateway: data.paymentMethod === "cod" ? "cod" : "manual",
      paidAt: initialPaymentStatus === "paid" ? new Date() : undefined,
    });

    customer.totalOrders = (customer.totalOrders || 0) + 1;
    customer.totalSpent = (customer.totalSpent || 0) + total;
    await customer.save();

    await notifyNewOrder({
      orderNumber: order.orderNumber,
      total,
      subtotal: order.subtotal,
      discount: order.discount,
      shippingFee: order.shippingFee,
      paymentMethod: order.paymentMethod,
      customerSnapshot: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      shippingAddress: order.shippingAddress,
      items: order.items?.map((it) => ({
        name: it.variantName ? `${it.name} (${it.variantName})` : it.name,
        quantity: it.quantity,
        price: it.price,
      })),
      createdAt: order.createdAt,
    });

    return apiSuccess(order, "Order created successfully", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
