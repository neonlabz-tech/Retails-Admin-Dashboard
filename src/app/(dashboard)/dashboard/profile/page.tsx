"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Save, KeyRound, UserCircle, Mail, Pencil, X, UploadCloud, Trash2 } from "lucide-react";
import { Button, Card, Input, LoadingState, Badge } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ROLE_LABELS, type AdminRole } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { validateName } from "@/lib/validators";
import { resizeImageToTarget } from "@/lib/image-utils";

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

  // Photo edit modal state
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string | null>(null);
  const [isStagedForRemoval, setIsStagedForRemoval] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleOpenPhotoModal() {
    setStagedFile(null);
    setStagedPreviewUrl(null);
    setIsStagedForRemoval(false);
    setPhotoModalOpen(true);
  }

  function handleClosePhotoModal() {
    if (stagedPreviewUrl) {
      URL.revokeObjectURL(stagedPreviewUrl);
    }
    setStagedFile(null);
    setStagedPreviewUrl(null);
    setIsStagedForRemoval(false);
    setPhotoModalOpen(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error("Please select a valid image file (JPG, PNG, WEBP, GIF)");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Selected image exceeds 15MB limit");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (stagedPreviewUrl) {
      URL.revokeObjectURL(stagedPreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setStagedFile(file);
    setStagedPreviewUrl(previewUrl);
    setIsStagedForRemoval(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleStageRemovePhoto() {
    if (stagedPreviewUrl) {
      URL.revokeObjectURL(stagedPreviewUrl);
    }
    setStagedFile(null);
    setStagedPreviewUrl(null);
    setIsStagedForRemoval(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSavePhoto() {
    if (!profile) return;
    setSavingPhoto(true);

    try {
      if (isStagedForRemoval) {
        const res = await fetch("/api/auth/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: "" }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          toast.error(json.message || "Failed to remove photo");
          return;
        }
        setProfile({ ...profile, avatar: "" });
        window.dispatchEvent(
          new CustomEvent("admin-profile-updated", {
            detail: { avatar: "", name: profile.name },
          })
        );
        router.refresh();
        toast.success("Profile photo removed successfully");
        handleClosePhotoModal();
        return;
      }

      if (stagedFile) {
        let processed = stagedFile;
        try {
          processed = await resizeImageToTarget(stagedFile, 400, 400);
        } catch (err) {
          console.warn("Resize failed, using original file:", err);
        }

        const formData = new FormData();
        formData.append("file", processed);
        formData.append("folder", "avatars");

        const uploadRes = await fetch("/api/uploads", { method: "POST", body: formData });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok || !uploadJson.success) {
          throw new Error(uploadJson.message || "Failed to upload image");
        }

        const newAvatarUrl = uploadJson.data.url;

        const updateRes = await fetch("/api/auth/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: newAvatarUrl }),
        });
        const updateJson = await updateRes.json();
        if (!updateRes.ok || !updateJson.success) {
          throw new Error(updateJson.message || "Failed to update profile avatar");
        }

        setProfile({ ...profile, avatar: newAvatarUrl });
        window.dispatchEvent(
          new CustomEvent("admin-profile-updated", {
            detail: { avatar: newAvatarUrl, name: profile.name },
          })
        );
        router.refresh();
        toast.success("Profile photo updated successfully");
        handleClosePhotoModal();
        return;
      }

      handleClosePhotoModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save photo");
    } finally {
      setSavingPhoto(false);
    }
  }

  const currentDisplayAvatar = isStagedForRemoval
    ? null
    : stagedPreviewUrl || profile?.avatar || null;

  const hasPhotoChanged = stagedFile !== null || (isStagedForRemoval && Boolean(profile?.avatar));

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
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-800">Profile Image</span>
            <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xs group">
              {profile.avatar ? (
                <Image
                  src={profile.avatar}
                  alt={profile.name}
                  fill
                  sizes="112px"
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/10 to-brand/20 text-brand font-bold text-2xl">
                  {profile.name?.charAt(0)?.toUpperCase() || "A"}
                </div>
              )}

              {/* Edit icon inside photo at top right side */}
              <button
                type="button"
                onClick={handleOpenPhotoModal}
                className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-white/95 text-slate-700 shadow-md ring-1 ring-slate-900/10 hover:bg-white hover:text-brand hover:scale-105 transition-all cursor-pointer"
                title="Edit profile photo"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
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

      {/* Profile Photo Popup Modal */}
      <Modal
        open={photoModalOpen}
        onClose={handleClosePhotoModal}
        title="Update Profile Photo"
        size="sm"
        footer={
          hasPhotoChanged ? (
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClosePhotoModal}
                disabled={savingPhoto}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSavePhoto}
                loading={savingPhoto}
                className="cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" /> Save changes
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleClosePhotoModal}
                className="cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          )
        }
      >
        <div className="flex flex-col items-center gap-4 py-2">
          {/* Avatar Preview */}
          <div className="relative h-36 w-36 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm ring-4 ring-slate-100">
            {currentDisplayAvatar ? (
              <Image
                src={currentDisplayAvatar}
                alt="Profile Preview"
                fill
                sizes="144px"
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/10 to-brand/20 text-brand font-bold text-4xl">
                {profile.name?.charAt(0)?.toUpperCase() || "A"}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
            >
              <UploadCloud className="h-4 w-4 text-brand" />
              <span>{currentDisplayAvatar ? "Change Photo" : "Upload Photo"}</span>
            </button>

            {currentDisplayAvatar && (
              <button
                type="button"
                onClick={handleStageRemovePhoto}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100/70 hover:text-rose-700 transition cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Remove Photo</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            JPG, PNG, WEBP or GIF • Square 1:1 format (max 5MB)
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={handleFileSelect}
          />
        </div>
      </Modal>
    </div>
  );
}
