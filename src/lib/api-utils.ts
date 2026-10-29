import { NextResponse } from "next/server";
import { ZodError } from "zod";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function apiSuccess<T>(data: T, message = "Success", status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(
    { success: true, message, data },
    { status, headers: { ...CORS_HEADERS, ...headers } }
  );
}

export function apiError(
  message = "Something went wrong",
  status = 400,
  errors?: unknown,
  headers: Record<string, string> = {}
) {
  return NextResponse.json(
    { success: false, message, errors: errors ?? null },
    { status, headers: { ...CORS_HEADERS, ...headers } }
  );
}

export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    return apiError("Validation failed", 422, err.flatten().fieldErrors);
  }
  if (err instanceof ApiException) {
    return apiError(err.message, err.status, err.errors);
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  if ((err as { code?: number })?.code === 11000) {
    return apiError("A record with this value already exists", 409);
  }
  console.error("[api-error]", err);
  return apiError(message, 500);
}

export class ApiException extends Error {
  status: number;
  errors?: unknown;
  constructor(message: string, status = 400, errors?: unknown) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}
