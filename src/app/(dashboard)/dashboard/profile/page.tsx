"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, KeyRound, UserCircle, Mail, Pencil, X } from "lucide-react";
import { Button, Card, Input, LoadingState, Badge } from "@/components/ui/primitives";
import { ImageUploader } from "@/components/ui/image-uploader";
import { useToast } from "@/components/ui/toast";
import { ROLE_LABELS, type AdminRole } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { validateName } from "@/lib/validators";

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatar?: string;
  lastLoginAt?: string;
  createdAt?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        if (json.success) {
          setProfile(json.data);
          setNameInput(json.data.name || "");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleStartEdit() {
    setNameInput(profile?.name || "");
    setNameError("");
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setNameInput(profile?.name || "");
    setNameError("");
    setIsEditing(false);
  }

  async function handleSaveProfile() {
    if (!profile) return;
    const err = validateName(nameInput);
    if (err) {
      setNameError(err);
      return;
    }
    setNameError("");
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to update profile");
        return;
      }
      toast.success("Profile updated successfully");
      const updatedName = nameInput.trim();
      setProfile({ ...profile, name: updatedName });
      setIsEditing(false);
      window.dispatchEvent(
        new CustomEvent("admin-profile-updated", {
          detail: { avatar: profile.avatar, name: updatedName },
        })
      );
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleSendResetEmail() {
    if (!profile?.email) return;
    setSendingReset(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to send password reset email");
        return;
      }
      if (json.data?.resetUrl) {
        console.log("🔗 Password Reset Link:", json.data.resetUrl);
      }
      toast.success(json.message || "Password reset email sent successfully");
    } catch {
      toast.error("Failed to send password reset email. Please try again.");
    } finally {
      setSendingReset(false);
    }
  }

  if (loading || !profile) return <LoadingState label="Loading profile..." />;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Admin Profile</h1>
        <p className="mt-0.5 text-xs sm:text-sm text-slate-500">Manage your personal account information and security.</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 border-b border-slate-100 pb-6">
          <ImageUploader
            variant="avatar"
            label="Profile Image"
            images={profile.avatar ? [profile.avatar] : []}
            onChange={async (images) => {
              const newAvatar = images[0] || "";
              setProfile((prev) => (prev ? { ...prev, avatar: newAvatar } : null));
              window.dispatchEvent(
                new CustomEvent("admin-profile-updated", {
                  detail: { avatar: newAvatar, name: profile.name },
                })
              );
              try {
                const res = await fetch("/api/auth/me", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ avatar: newAvatar }),
                });
                if (res.ok) {
                  router.refresh();
                }
              } catch (err) {
                console.error("Auto-sync avatar failed:", err);
              }
            }}
            folder="avatars"
            max={1}
          />
          <div className="flex-1 text-center sm:text-left sm:pl-6 sm:border-l sm:border-slate-100">
            <p className="text-lg font-semibold text-slate-900">{profile.name}</p>
            <p className="text-sm text-slate-500">{profile.email}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge color="purple">{ROLE_LABELS[profile.role]}</Badge>
              {profile.lastLoginAt && <span className="text-xs text-slate-400">Last login: {formatDateTime(profile.lastLoginAt)}</span>}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <UserCircle className="h-4 w-4 text-slate-600" />
              <span>Personal Information</span>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveProfile}
                  loading={saving}
                  className="cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" /> Save changes
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleStartEdit}
                className="cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5 text-slate-500" /> Edit
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              value={isEditing ? nameInput : profile.name}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (nameError) setNameError("");
              }}
              disabled={!isEditing}
              error={nameError}
              className={!isEditing ? "bg-slate-50/70 border-slate-200 text-slate-700 cursor-default select-all" : ""}
            />
            <Input
              label="Email address"
              type="email"
              value={profile.email}
              disabled
              hint="Email address cannot be changed"
              className="bg-slate-50/70 border-slate-200 text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <KeyRound className="h-4 w-4 text-slate-700" />
          <span>Change Password</span>
        </div>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
          Need to update your password? Click below to send a secure password reset link to your registered email (<strong className="font-semibold text-slate-900">{profile.email}</strong>).
        </p>
        <div className="mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleSendResetEmail}
            loading={sendingReset}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-100/80 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-200/70 hover:text-slate-900 transition shadow-none cursor-pointer"
          >
            <Mail className="h-4 w-4 text-slate-500" />
            <span>Send Password Reset Email</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
