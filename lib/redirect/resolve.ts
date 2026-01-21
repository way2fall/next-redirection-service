import { getKv } from "@/lib/storage";

function normalizeSlug(raw: string) {
  return raw.trim().toLowerCase();
}

function isValidSlug(slug: string) {
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(slug);
}

export type RedirectResolution =
  | { kind: "not_found" }
  | { kind: "fallback"; reason: "slug_disabled" | "all_destinations_disabled" }
  | { kind: "redirect"; url: string; destinationId: string };

export async function resolveRedirectForSlug(
  slugRaw: string,
  options?: { track?: boolean }
): Promise<RedirectResolution> {
  const slug = normalizeSlug(slugRaw);
  if (!slug || !isValidSlug(slug)) return { kind: "not_found" };

  const track = options?.track !== false;
  const kv = getKv();
  const config = await kv.getRedirectConfig(slug);
  if (!config) return { kind: "not_found" };
  if (!config.enabled) return { kind: "fallback", reason: "slug_disabled" };

  const enabled = config.destinations.filter((d) => d.enabled);
  if (enabled.length === 0) return { kind: "fallback", reason: "all_destinations_disabled" };

  let chosen: { id: string; url: string } | null = null;
  if (!track || enabled.length === 1) {
    chosen = { id: enabled[0]!.id, url: enabled[0]!.url };
  } else {
    const cursor = await kv.nextRoundRobinCursor(slug);
    const start = config.destinations.length ? cursor % config.destinations.length : 0;
    for (let i = 0; i < config.destinations.length; i++) {
      const idx = (start + i) % config.destinations.length;
      const d = config.destinations[idx]!;
      if (!d.enabled) continue;
      chosen = { id: d.id, url: d.url };
      break;
    }
  }

  if (!chosen) return { kind: "fallback", reason: "all_destinations_disabled" };

  try {
    const url = new URL(chosen.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") return { kind: "not_found" };
  } catch {
    return { kind: "not_found" };
  }

  if (track) {
    void kv.recordClick(slug, chosen.id).catch(() => {});
  }
  return { kind: "redirect", url: chosen.url, destinationId: chosen.id };
}
