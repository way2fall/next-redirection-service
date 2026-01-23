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

  const slots: Array<{ destinationId: string; url: string; enabled: boolean }> = [];
  for (const d of config.destinations) {
    for (const url of d.urls) {
      slots.push({ destinationId: d.id, url, enabled: d.enabled });
    }
  }

  const enabledSlots = slots.filter((s) => s.enabled);
  if (enabledSlots.length === 0) return { kind: "fallback", reason: "all_destinations_disabled" };

  let chosen: { id: string; url: string } | null = null;
  if (!track || enabledSlots.length === 1) {
    chosen = { id: enabledSlots[0]!.destinationId, url: enabledSlots[0]!.url };
  } else {
    const cursor = await kv.nextRoundRobinCursor(slug);
    const idx = cursor % enabledSlots.length;
    const s = enabledSlots[idx]!;
    chosen = { id: s.destinationId, url: s.url };
  }

  if (!chosen) return { kind: "fallback", reason: "all_destinations_disabled" };

  try {
    const url = new URL(chosen.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") return { kind: "not_found" };
  } catch {
    return { kind: "not_found" };
  }

  return { kind: "redirect", url: chosen.url, destinationId: chosen.id };
}
