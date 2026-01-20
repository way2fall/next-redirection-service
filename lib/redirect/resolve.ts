import { getKv } from "@/lib/storage";

function normalizeSlug(raw: string) {
  return raw.trim().toLowerCase();
}

function isValidSlug(slug: string) {
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(slug);
}

export async function resolveDestinationForSlug(slugRaw: string) {
  const slug = normalizeSlug(slugRaw);
  if (!slug || !isValidSlug(slug)) return null;

  const kv = getKv();
  const destination = await kv.getDestination(slug);
  if (!destination) return null;

  try {
    const url = new URL(destination);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  } catch {
    return null;
  }

  // Best-effort analytics: do not block redirect on click tracking.
  void kv.incrementClick(slug).catch(() => {});
  return destination;
}
