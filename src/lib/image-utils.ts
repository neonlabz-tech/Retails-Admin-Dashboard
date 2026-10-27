export interface ImageDimensions {
  width: number;
  height: number;
}

export interface FolderDimensionConfig {
  width: number;
  height: number;
  badge: string;
  hint: string;
  label: string;
}

export const DEFAULT_FOLDER_DIMENSIONS: Record<string, FolderDimensionConfig> = {
  categories: {
    width: 750,
    height: 750,
    badge: "750 × 750 px",
    hint: "Auto-fitted to 750 × 750 px (1:1 Square) • Max 15MB",
    label: "Square 1:1",
  },
  products: {
    width: 1200,
    height: 1600,
    badge: "1200 × 1600 px",
    hint: "Auto-fitted to 1200 × 1600 px (3:4 Portrait) • Max 15MB",
    label: "Portrait 3:4",
  },
};

/**
 * Resizes and center-crops (cover fit) an image file to exact target dimensions
 * using an HTML5 Canvas. Returns a new File object with the exact target width and height.
 */
export async function resizeImageToTarget(
  file: File,
  targetWidth: number,
  targetHeight: number,
  quality = 0.92
): Promise<File> {
  // If running in SSR or file is GIF, skip canvas resize
  if (typeof window === "undefined" || file.type === "image/gif") {
    return file;
  }

  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;

        if (!srcW || !srcH) {
          resolve(file);
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Center-crop (cover fit)
        const srcRatio = srcW / srcH;
        const targetRatio = targetWidth / targetHeight;

        let sx = 0;
        let sy = 0;
        let sWidth = srcW;
        let sHeight = srcH;

        if (srcRatio > targetRatio) {
          // Source is wider than target: crop left & right
          sWidth = Math.round(srcH * targetRatio);
          sx = Math.round((srcW - sWidth) / 2);
        } else if (srcRatio < targetRatio) {
          // Source is taller than target: crop top & bottom
          sHeight = Math.round(srcW / targetRatio);
          sy = Math.round((srcH - sHeight) / 2);
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

        // Prefer webp, fallback to jpeg if toBlob produces null
        const mimeType = "image/webp";

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              canvas.toBlob(
                (fallbackBlob) => {
                  if (!fallbackBlob) {
                    resolve(file);
                    return;
                  }
                  const baseName = file.name.replace(/\.[^/.]+$/, "");
                  const processedFile = new File([fallbackBlob], `${baseName}-${targetWidth}x${targetHeight}.jpg`, {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                  });
                  resolve(processedFile);
                },
                "image/jpeg",
                quality
              );
              return;
            }

            const baseName = file.name.replace(/\.[^/.]+$/, "");
            const processedFile = new File([blob], `${baseName}-${targetWidth}x${targetHeight}.webp`, {
              type: mimeType,
              lastModified: Date.now(),
            });
            resolve(processedFile);
          },
          mimeType,
          quality
        );
      } catch {
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
