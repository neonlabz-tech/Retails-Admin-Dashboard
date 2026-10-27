"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, X, Loader2, ImageOff, UploadCloud } from "lucide-react";
import { useToast } from "./toast";
import { DEFAULT_FOLDER_DIMENSIONS, resizeImageToTarget } from "@/lib/image-utils";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  required?: boolean;
  badge?: string;
  hint?: string;
  error?: string;
  className?: string;
  targetDimensions?: { width: number; height: number };
}

export function ImageUpload({
  value,
  onChange,
  folder = "categories",
  label = "Category Image",
  required,
  badge,
  hint,
  error,
  className = "",
  targetDimensions,
}: ImageUploadProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const folderConfig = folder ? DEFAULT_FOLDER_DIMENSIONS[folder] : undefined;
  const dims = targetDimensions ?? (folderConfig ? { width: folderConfig.width, height: folderConfig.height } : undefined);
  const effectiveBadge = badge ?? folderConfig?.badge ?? (dims ? `${dims.width} × ${dims.height} px` : undefined);
  const effectiveHint =
    hint ??
    folderConfig?.hint ??
    (dims ? `Auto-fitted to ${dims.width} × ${dims.height} px • Max 15MB` : "JPEG, PNG, WEBP, or GIF up to 5MB");

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setPreviewUrl(null);
    setLoadFailed(false);
  }

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const displayUrl = previewUrl ?? value ?? null;

  async function handleFileSelected(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPEG, PNG, WEBP, or GIF images are allowed");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const maxInitialSize = dims ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxInitialSize) {
      toast.error(`File is too large. Maximum size is ${dims ? "15MB" : "5MB"}.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setLoadFailed(false);
    setUploading(true);
    setStatusText(dims ? `Fitting to ${dims.width} × ${dims.height}...` : "Preparing image...");

    let fileToUpload = file;
    if (dims) {
      try {
        fileToUpload = await resizeImageToTarget(file, dims.width, dims.height);
      } catch (err) {
        console.warn("Image resizing failed, proceeding with original:", err);
      }
    }

    if (fileToUpload.size > 5 * 1024 * 1024) {
      toast.error("Processed file is too large (exceeds 5MB). Please choose a smaller image.");
      setUploading(false);
      setStatusText(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const localPreview = URL.createObjectURL(fileToUpload);
    setPreviewUrl(localPreview);
    setStatusText("Uploading to cloud...");

    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("folder", folder);

      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Upload failed");
      }

      onChange(json.data.url);
      toast.success(
        dims
          ? `Image uploaded & fitted to ${dims.width} × ${dims.height} px`
          : "Image uploaded successfully"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setPreviewUrl(null);
      onChange("");
    } finally {
      setUploading(false);
      setStatusText(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove() {
    setPreviewUrl(null);
    setLoadFailed(false);
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className={`text-sm font-semibold ${error ? "text-rose-600" : "text-slate-800"}`}>
            {label} {required && <span className="text-rose-500 font-bold">*</span>}
          </label>
          {effectiveBadge && (
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/15">
              {effectiveBadge}
            </span>
          )}
        </div>
      )}

      {displayUrl && !loadFailed ? (
        <div className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/50 p-2 shadow-xs transition-all">
          <Image
            src={displayUrl}
            alt="Preview"
            width={dims?.width || 400}
            height={dims?.height || 300}
            unoptimized
            className={`w-auto max-w-full rounded-xl object-contain block transition-all ${
              dims && dims.height > dims.width ? "max-h-80" : "max-h-72"
            }`}
            onError={() => setLoadFailed(true)}
          />

          {effectiveBadge && !uploading && (
            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-md bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 text-[11px] font-medium text-white shadow-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{effectiveBadge}</span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-slate-950/60 backdrop-blur-xs rounded-2xl text-white">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
              <span className="text-xs font-medium">{statusText || "Uploading image..."}</span>
            </div>
          )}

          {!uploading && (
            <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-md bg-slate-900/90 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 transition shadow-sm"
              >
                Change
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="rounded-md bg-slate-900/90 p-1.5 text-white hover:bg-red-700 transition shadow-sm"
                aria-label="Remove image"
                title="Remove image"
              >
                <X className="h-3.5 w-3.5 stroke-[2.5]" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFileSelected(file);
          }}
          className={`relative flex min-h-[10rem] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition p-6 text-center ${
            error
              ? "border-rose-400 bg-rose-50/20"
              : "border-indigo-100/90 bg-slate-50/40 hover:border-indigo-300 hover:bg-slate-50"
          }`}
        >
          {loadFailed ? (
            <div className="flex flex-col items-center gap-2 text-rose-500 py-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                <ImageOff className="h-6 w-6" />
              </div>
              <span className="text-sm font-semibold text-rose-600">
                Image failed to load — click to replace
              </span>
              <span className="text-xs text-slate-400">
                {effectiveHint}
              </span>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition shadow-xs"
                >
                  Upload New Image
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600">
                <UploadCloud className="h-5 w-5" />
              </div>
              <p className="text-xs sm:text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Click to browse</span> or drag and drop
              </p>
              {effectiveHint && <p className="mt-1 text-xs text-slate-400">{effectiveHint}</p>}
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
        }}
      />

      {error && <p className="text-xs font-medium text-rose-500">{error}</p>}
    </div>
  );
}
