"use client";

import { useEffect, useState } from "react";
import { Save, Store, Mail, Package, Bell, Share2 } from "lucide-react";
import { Button, Card, Input, Tabs, Switch, LoadingState } from "@/components/ui/primitives";
import { ImageUploader } from "@/components/ui/image-uploader";
import { useToast } from "@/components/ui/toast";

interface SettingsData {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  storeLogo: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  socialLinks: { facebook: string; instagram: string; twitter: string };
  orderSettings: { autoConfirmOrders: boolean; allowCancellationWindowHours: number; minOrderAmount: number };
  inventorySettings: { defaultLowStockThreshold: number; allowBackorder: boolean };
  emailSettings: { lowStockAlerts: boolean; newOrderAlerts: boolean; orderStatusUpdates: boolean; newCustomerAlerts: boolean };
}

const TABS = [
  { key: "store", label: "Store Information" },
  { key: "orders", label: "Order Configuration" },
  { key: "inventory", label: "Inventory Settings" },
  { key: "notifications", label: "Email Notifications" },
  { key: "social", label: "Social Links" },
];

export default function SettingsPage() {
  const toast = useToast();
  const [tab, setTab] = useState("store");
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function clearFieldError(field: string) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (json.success) setSettings(json.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    if (!settings) return;
    const errs: Record<string, string> = {};
    if (!settings.storeName.trim()) errs.storeName = "Store name is required";
    if (settings.storeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.storeEmail.trim())) {
      errs.storeEmail = "Valid email address is required";
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to save settings");
        return;
      }
      toast.success("Settings saved successfully");
      setSettings(json.data);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) return <LoadingState label="Loading settings..." />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Store &amp; System Settings</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">Configure your store information and operational preferences.</p>
        </div>
        <Button onClick={handleSave} loading={saving} className="shrink-0">
          <Save className="h-4 w-4" /> Save changes
        </Button>
      </div>

      <Card>
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="p-5">
          {tab === "store" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Store className="h-4 w-4" /> Store Information
              </div>
              <div>
                <ImageUploader
                  label="Store Logo"
                  images={settings.storeLogo ? [settings.storeLogo] : []}
                  onChange={(images) => setSettings({ ...settings, storeLogo: images[0] || "" })}
                  folder="settings"
                  max={1}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Store name"
                  error={fieldErrors.storeName}
                  value={settings.storeName}
                  onChange={(e) => {
                    setSettings({ ...settings, storeName: e.target.value });
                    clearFieldError("storeName");
                  }}
                />
                <Input
                  label="Store email"
                  type="email"
                  error={fieldErrors.storeEmail}
                  value={settings.storeEmail}
                  onChange={(e) => {
                    setSettings({ ...settings, storeEmail: e.target.value });
                    clearFieldError("storeEmail");
                  }}
                />
                <Input label="Store phone" value={settings.storePhone} onChange={(e) => setSettings({ ...settings, storePhone: e.target.value })} />
                <Input label="Timezone" value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} />
                <Input label="Currency code" value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} />
                <Input label="Currency symbol" value={settings.currencySymbol} onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })} />
              </div>
              <Input label="Store address" value={settings.storeAddress} onChange={(e) => setSettings({ ...settings, storeAddress: e.target.value })} />
            </div>
          )}

          {tab === "orders" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Package className="h-4 w-4" /> Order Configuration
              </div>
              <Switch
                checked={settings.orderSettings.autoConfirmOrders}
                onChange={(v) => setSettings({ ...settings, orderSettings: { ...settings.orderSettings, autoConfirmOrders: v } })}
                label="Automatically confirm new orders"
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Cancellation window (hours)"
                  type="number"
                  value={settings.orderSettings.allowCancellationWindowHours}
                  onChange={(e) =>
                    setSettings({ ...settings, orderSettings: { ...settings.orderSettings, allowCancellationWindowHours: Number(e.target.value) } })
                  }
                />
                <Input
                  label="Minimum order amount"
                  type="number"
                  value={settings.orderSettings.minOrderAmount}
                  onChange={(e) => setSettings({ ...settings, orderSettings: { ...settings.orderSettings, minOrderAmount: Number(e.target.value) } })}
                />
              </div>
            </div>
          )}

          {tab === "inventory" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Package className="h-4 w-4" /> Inventory Settings
              </div>
              <Input
                label="Default low-stock threshold"
                type="number"
                value={settings.inventorySettings.defaultLowStockThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, inventorySettings: { ...settings.inventorySettings, defaultLowStockThreshold: Number(e.target.value) } })
                }
              />
              <Switch
                checked={settings.inventorySettings.allowBackorder}
                onChange={(v) => setSettings({ ...settings, inventorySettings: { ...settings.inventorySettings, allowBackorder: v } })}
                label="Allow orders when stock is unavailable (backorder)"
              />
            </div>
          )}

          {tab === "notifications" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Bell className="h-4 w-4" /> Email Notification Preferences
              </div>
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <Mail className="h-3.5 w-3.5" /> Emails are sent via Resend to the store email above.
              </p>
              <Switch
                checked={settings.emailSettings.newOrderAlerts}
                onChange={(v) => setSettings({ ...settings, emailSettings: { ...settings.emailSettings, newOrderAlerts: v } })}
                label="Notify on new orders"
              />
              <Switch
                checked={settings.emailSettings.lowStockAlerts}
                onChange={(v) => setSettings({ ...settings, emailSettings: { ...settings.emailSettings, lowStockAlerts: v } })}
                label="Notify on low/out-of-stock products"
              />
              <Switch
                checked={settings.emailSettings.orderStatusUpdates}
                onChange={(v) => setSettings({ ...settings, emailSettings: { ...settings.emailSettings, orderStatusUpdates: v } })}
                label="Notify customers on order status updates"
              />
              <Switch
                checked={settings.emailSettings.newCustomerAlerts}
                onChange={(v) => setSettings({ ...settings, emailSettings: { ...settings.emailSettings, newCustomerAlerts: v } })}
                label="Notify on new customer registrations"
              />
            </div>
          )}

          {tab === "social" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Share2 className="h-4 w-4" /> Social Links
              </div>
              <Input label="Facebook URL" value={settings.socialLinks.facebook} onChange={(e) => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, facebook: e.target.value } })} />
              <Input label="Instagram URL" value={settings.socialLinks.instagram} onChange={(e) => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, instagram: e.target.value } })} />
              <Input label="Twitter / X URL" value={settings.socialLinks.twitter} onChange={(e) => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, twitter: e.target.value } })} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
