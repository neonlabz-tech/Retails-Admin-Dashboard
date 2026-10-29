import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "ecommerce-uploads";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

export const isR2Configured = Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ENDPOINT);

let client: S3Client | null = null;
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID as string,
        secretAccessKey: R2_SECRET_ACCESS_KEY as string,
      },
    });
  }
  return client;
}

export interface UploadResult {
  url: string;
  key: string;
}

/**
 * Uploads a file buffer to Cloudflare R2 when credentials are configured.
 * Falls back to local filesystem storage under /public/uploads for local
 * development/sandbox environments where R2 secrets aren't provisioned yet.
 */
export async function uploadFile(buffer: Buffer, filename: string, contentType: string, folder = "products"): Promise<UploadResult> {
  const ext = path.extname(filename) || "";
  const key = `${folder}/${Date.now()}-${randomUUID()}${ext}`;

  if (isR2Configured) {
    await getClient().send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    const publicBase = R2_PUBLIC_URL || `${R2_ENDPOINT}/${R2_BUCKET_NAME}`;
    return { url: `${publicBase.replace(/\/$/, "")}/${key}`, key };
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadsDir, { recursive: true });
  const localName = `${Date.now()}-${randomUUID()}${ext}`;
  await writeFile(path.join(uploadsDir, localName), buffer);
  return { url: `/uploads/${folder}/${localName}`, key: `local:${folder}/${localName}` };
}

export function getKeyFromUrl(urlOrKey: string): string | null {
  if (!urlOrKey || typeof urlOrKey !== "string") return null;
  const str = urlOrKey.trim();
  if (!str) return null;

  if (str.startsWith("local:")) return str;

  const localMatch = str.match(/(?:^|\/)uploads\/(.+)$/);
  if (localMatch) {
    return `local:${localMatch[1]}`;
  }

  if (/^(products|categories|heroes|teledramas|programs|store)\/[^/?#]+$/i.test(str)) {
    return str;
  }

  if (R2_PUBLIC_URL && str.startsWith(R2_PUBLIC_URL.replace(/\/$/, ""))) {
    const rel = str.slice(R2_PUBLIC_URL.replace(/\/$/, "").length).replace(/^\/+/, "");
    if (rel) {
      const cleanRel = rel.split("?")[0].split("#")[0];
      return decodeURIComponent(cleanRel);
    }
  }

  try {
    const parsed = new URL(str);
    let pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");

    if (R2_BUCKET_NAME && pathname.startsWith(`${R2_BUCKET_NAME}/`)) {
      pathname = pathname.slice(R2_BUCKET_NAME.length + 1);
    }

    if (pathname) return pathname;
  } catch {
    const cleaned = str.split("?")[0].split("#")[0].replace(/^\/+/, "");
    if (/^(products|categories|heroes|teledramas|programs|store)\/.+/i.test(cleaned)) {
      return cleaned;
    }
  }

  return null;
}

export async function deleteFile(keyOrUrl: string): Promise<void> {
  if (!keyOrUrl) return;
  const key = getKeyFromUrl(keyOrUrl) || keyOrUrl;
  if (!key) return;

  if (key.startsWith("local:")) {
    const relative = key.replace("local:", "");
    const filePath = path.join(process.cwd(), "public", "uploads", relative);
    try {
      await unlink(filePath);
    } catch {
      // ignore
    }
    return;
  }

  if (isR2Configured) {
    try {
      await getClient().send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    } catch (err) {
      console.warn(`[r2] Failed to delete object "${key}":`, (err as Error).message);
    }
  }
}

