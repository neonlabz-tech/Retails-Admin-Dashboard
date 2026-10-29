"use client";

import Image from "next/image";
import { useRef, useState, useId } from "react";
import { ImagePlus, X, Loader2, ArrowLeft, ArrowRight, Star, UploadCloud, Camera } from "lucide-react";
import { useToast } from "./toast";
import { DEFAULT_FOLDER_DIMENSIONS, resizeImageToTarget } from "@/lib/image-utils";
import { cn } from "@/lib/utils";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder?: string;
  max?: number;
  label?: string;
  required?: boolean;
  error?: string;
  badge?: string;
  hint?: string;
  hideHint?: boolean;
  className?: string;
  variant?: "default" | "avatar";
}

export function ImageUploader({
  images = [],
  onChange,
  folder = "products",
  max = 5,
  label,
  required,
  error,
  badge,
  hint,
  hideHint = false,
  className = "",
  variant = "default",
}: ImageUploaderProps) {
  const isAvatar = variant === "avatar" || folder === "avatars";
  const defaultLabel = isAvatar ? "Profile Image" : "Product Images";
  const effectiveLabel = label ?? defaultLabel;
  const effectiveMax = isAvatar ? (max === 5 ? 1 : max) : max;

  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const toast = useToast();

  const folderConfig = folder ? DEFAULT_FOLDER_DIMENSIONS[folder] : undefined;
  const effectiveBadge = isAvatar ? undefined : (badge ?? folderConfig?.badge ?? (folderConfig ? `${folderConfig.width} × ${folderConfig.height} px` : undefined));
  const defaultHint = isAvatar
    ? "JPG, PNG or WEBP (Square recommended, max 5MB)"
    : `PNG, JPG, WEBP or GIF. Add 1 to ${effectiveMax} images (First image is the cover).`;
  const effectiveHint = hint ?? folderConfig?.hint ?? defaultHint;

  async function handleFiles(files: FileList | null | File[]) {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);

    // If avatar, selecting a file replaces the existing avatar directly
    if (isAvatar) {
      const file = fileList[0];
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" is not a supported format (JPG, PNG, WEBP, GIF only)`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the 15MB size limit.`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      setUploading(true);
      try {
        let processed = file;
        setUploadProgress("Optimizing avatar...");
        if (folderConfig) {
          try {
            processed = await resizeImageToTarget(file, folderConfig.width, folderConfig.height);
          } catch (err) {
            console.warn("Resize failed, using original file:", err);
          }
        }
        if (processed.size > 5 * 1024 * 1024) {
          toast.error(`"${file.name}" exceeds 5MB after processing.`);
          return;
        }

        setUploadProgress("Uploading avatar...");
        const formData = new FormData();
        formData.append("file", processed);
        formData.append("folder", folder);

        const res = await fetch("/api/uploads", { method: "POST", body: formData });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || `Failed to upload "${file.name}"`);
        }
        onChange([json.data.url]);
        toast.success("Profile image updated successfully");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to upload image");
      } finally {
        setUploading(false);
        setUploadProgress(null);
        if (inputRef.current) inputRef.current.value = "";
      }
      return;
    }

    const remainingSlots = effectiveMax - images.length;

    if (remainingSlots <= 0) {
      toast.error(`You have already uploaded the maximum of ${effectiveMax} images.`);
      return;
    }

    const selectedFiles = fileList.slice(0, remainingSlots);
    if (fileList.length > remainingSlots) {
      toast.info(`Only ${remainingSlots} more image${remainingSlots > 1 ? "s" : ""} can be added (max ${effectiveMax}).`);
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    for (const f of selectedFiles) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        toast.error(`"${f.name}" is not a supported format (JPG, PNG, WEBP, GIF only)`);
        continue;
      }
      if (f.size > 15 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds the 15MB size limit.`);
        continue;
      }
      validFiles.push(f);
    }

    if (validFiles.length === 0) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      const config = folderConfig;

      for (let i = 0; i < validFiles.length; i++) {
        let file = validFiles[i];
        setUploadProgress(`Processing ${i + 1} of ${validFiles.length}...`);

        if (config) {
          try {
            file = await resizeImageToTarget(file, config.width, config.height);
          } catch (err) {
            console.warn("Resize failed, using original file:", err);
          }
        }

        if (file.size > 5 * 1024 * 1024) {
          toast.error(`"${file.name}" exceeds 5MB after processing.`);
          continue;
        }

        setUploadProgress(`Uploading ${i + 1} of ${validFiles.length}...`);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const res = await fetch("/api/uploads", { method: "POST", body: formData });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || `Failed to upload "${file.name}"`);
        }
        uploadedUrls.push(json.data.url);
      }

      if (uploadedUrls.length > 0) {
        onChange([...images, ...uploadedUrls]);
        toast.success(
          uploadedUrls.length === 1
            ? "Image uploaded successfully"
            : `${uploadedUrls.length} images uploaded successfully`
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage(index: number) {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  }

  function setAsCover(index: number) {
    if (index === 0) return;
    const target = images[index];
    const remaining = images.filter((_, i) => i !== index);
    onChange([target, ...remaining]);
    toast.success("Set as primary cover photo");
  }

  function moveImage(from: number, to: number) {
    if (to < 0 || to >= images.length) return;
    const copy = [...images];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    onChange(copy);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (uploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  if (isAvatar) {
    const currentImage = images[0];

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {effectiveLabel && (
          <label
            htmlFor={inputId}
            className={cn(
              "text-sm font-semibold flex items-center gap-1.5",
              error ? "text-rose-600" : "text-slate-800"
            )}
          >
            {effectiveLabel}
            {required && <span className="text-rose-500 font-bold">*</span>}
          </label>
        )}

        <div className="flex items-center gap-3.5">
          <div
            className={cn(
              "group relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-2xl border bg-white shadow-2xs transition-all",
              error
                ? "border-rose-300 ring-2 ring-rose-100"
                : isDragOver
                ? "border-brand ring-4 ring-brand/10"
                : "border-slate-200 hover:border-slate-300",
              uploading && "pointer-events-none"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            {currentImage ? (
              <>
                <Image
                  src={currentImage}
                  alt={effectiveLabel}
                  fill
                  sizes="96px"
                  unoptimized
                  className="object-cover"
                />

                {/* Hover overlay with action buttons */}
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/60 opacity-0 backdrop-blur-[1px] transition-opacity duration-150 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => !uploading && inputRef.current?.click()}
                    className="flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800 shadow-xs hover:bg-white transition cursor-pointer"
                    title="Change image"
                  >
                    <Camera className="h-3 w-3 text-slate-600" />
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(0)}
                    className="mt-1 flex items-center gap-0.5 text-[9px] font-medium text-rose-300 hover:text-rose-200 transition cursor-pointer"
                    title="Remove image"
                  >
                    <X className="h-2.5 w-2.5" />
                    Remove
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => !uploading && inputRef.current?.click()}
                className="flex h-full w-full flex-col items-center justify-center gap-1 bg-slate-50 text-slate-400 hover:bg-slate-100/80 hover:text-brand transition cursor-pointer"
              >
                <Camera className="h-6 w-6 stroke-[1.75]" />
                <span className="text-[10px] font-medium">Upload</span>
              </button>
            )}

            {/* Loading spinner */}
            {uploading && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/70 backdrop-blur-[1px]">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
                <span className="mt-0.5 text-[8px] font-medium text-white">Uploading...</span>
              </div>
            )}
          </div>

          {/* Action text / hint next to avatar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => !uploading && inputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
              >
                <UploadCloud className="h-3.5 w-3.5 text-brand" />
                {currentImage ? "Change photo" : "Upload photo"}
              </button>
              {currentImage && (
                <button
                  type="button"
                  onClick={() => removeImage(0)}
                  disabled={uploading}
                  className="rounded-lg px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
            {!hideHint && (
              <p className="text-[11px] text-slate-400">{effectiveHint}</p>
            )}
            {error && <p className="text-[11px] font-medium text-rose-600">{error}</p>}
          </div>
        </div>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header with Label and Counter */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className={cn(
            "text-sm font-semibold flex items-center gap-1.5",
            error ? "text-rose-600" : "text-slate-800"
          )}
        >
          {effectiveLabel}
          {required && <span className="text-rose-500 font-bold">*</span>}
          <span className="text-xs font-normal text-slate-500">
            ({images.length}/{effectiveMax} images)
          </span>
        </label>
        {effectiveBadge && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600">
            {effectiveBadge}
          </span>
        )}
      </div>

      {/* Main Image Grid / Empty Dropzone */}
      {images.length === 0 ? (
        // Empty State: Full-width drag & drop area
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer select-none",
            isDragOver
              ? "border-brand bg-brand/5 ring-4 ring-brand/10"
              : error
              ? "border-rose-300 bg-rose-50/30 hover:border-rose-400"
              : "border-slate-300 bg-slate-50/60 hover:border-brand hover:bg-slate-50",
            uploading && "pointer-events-none opacity-80"
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
              <p className="text-sm font-semibold text-slate-700">{uploadProgress || "Uploading..."}</p>
              <p className="text-xs text-slate-400">Optimizing & fitting to portrait format</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-xs ring-1 ring-slate-200">
                <UploadCloud className="h-6 w-6 text-brand" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  <span className="text-brand hover:underline">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select 1 to {max} images • First image will be the primary cover
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Populated State: Gallery Thumbnails + Add More Button
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "rounded-2xl border p-3 transition-colors",
            isDragOver ? "border-brand bg-brand/5" : "border-slate-200 bg-slate-50/50"
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            {images.map((img, idx) => (
              <div
                key={img + idx}
                className={cn(
                  "group relative h-32 w-24 shrink-0 overflow-hidden rounded-xl border bg-white shadow-2xs transition-all",
                  idx === 0
                    ? "border-brand/60 ring-2 ring-brand/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <Image
                  src={img}
                  alt={`Product image ${idx + 1}`}
                  fill
                  sizes="96px"
                  unoptimized
                  className="object-cover"
                />

                {/* Primary Cover Badge on 1st Image */}
                {idx === 0 && (
                  <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 rounded-md bg-brand px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-xs">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    Cover
                  </div>
                )}

                {/* Order Index Badge (2, 3, 4, 5) */}
                {idx > 0 && (
                  <div className="absolute top-1.5 left-1.5 z-10 rounded-md bg-slate-900/70 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-xs">
                    #{idx + 1}
                  </div>
                )}

                {/* Actions Overlay on Hover */}
                <div className="absolute inset-0 z-20 flex flex-col justify-between bg-slate-950/60 p-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <div className="flex items-center justify-between">
                    {/* Make Cover Button if not cover */}
                    {idx > 0 ? (
                      <button
                        type="button"
                        onClick={() => setAsCover(idx)}
                        title="Set as cover photo"
                        className="rounded bg-brand/90 p-1 text-[10px] font-semibold text-white hover:bg-brand transition cursor-pointer"
                      >
                        Make Cover
                      </button>
                    ) : (
                      <span />
                    )}

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      title="Remove image"
                      className="rounded-full bg-rose-600/90 p-1 text-white hover:bg-rose-600 transition cursor-pointer ml-auto"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Move Left / Right Buttons */}
                  <div className="flex items-center justify-between gap-1 mt-auto">
                    {idx > 0 ? (
                      <button
                        type="button"
                        onClick={() => moveImage(idx, idx - 1)}
                        title="Move left"
                        className="rounded bg-white/80 p-1 text-slate-800 hover:bg-white transition cursor-pointer"
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </button>
                    ) : (
                      <span />
                    )}
                    {idx < images.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => moveImage(idx, idx + 1)}
                        title="Move right"
                        className="rounded bg-white/80 p-1 text-slate-800 hover:bg-white transition cursor-pointer ml-auto"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* "Add More" Button if under limit */}
            {images.length < effectiveMax && (
              <button
                type="button"
                onClick={() => !uploading && inputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "flex h-32 w-24 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-white/80 text-slate-500 transition-all cursor-pointer hover:border-brand hover:text-brand hover:bg-white shadow-2xs",
                  uploading && "pointer-events-none opacity-60"
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-brand" />
                    <span className="text-[10px] font-semibold text-brand">Uploading</span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-5 w-5 text-slate-400 group-hover:text-brand" />
                    <span className="text-[11px] font-semibold">Add image</span>
                    <span className="text-[9px] text-slate-400">
                      {images.length}/{effectiveMax}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hidden File Input (supports multiple file selection) */}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple={max > 1}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Helper Hint and Error */}
      <div className="flex flex-col gap-1 pt-0.5">
        {!hideHint && effectiveHint && (
          <p className="text-xs text-slate-500">{effectiveHint}</p>
        )}
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
