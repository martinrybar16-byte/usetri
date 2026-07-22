import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * StorageService seam (ARCHITECTURE.md §2): Supabase Storage behind a tiny
 * interface. S3 or anything else can replace this module without touching
 * call sites. Bucket "usetri" must exist and be public.
 */

const BUCKET = process.env.STORAGE_BUCKET ?? "usetri";

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Storage is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env"
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function isStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Uploads a buffer and returns its public URL. Overwrites existing path. */
export async function uploadFile(
  path: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const client = supabase();
  const { error } = await client.storage.from(BUCKET).upload(path, data, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Storage upload failed (${path}): ${error.message}`);

  const { data: pub } = client.storage.from(BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

export async function deleteFolder(prefix: string): Promise<void> {
  const client = supabase();
  const { data: files } = await client.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (files && files.length > 0) {
    await client.storage
      .from(BUCKET)
      .remove(files.map((f) => `${prefix}/${f.name}`));
  }
}
