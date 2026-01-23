import type { KvStore } from "../kv";
import type {
  AddDestinationInput,
  CreateSlugInput,
  DeleteDestinationInput,
  DestinationRecord,
  EditDestinationInput,
  ResetDestinationClickCountInput,
  SetDestinationEnabledInput,
  SlugDetails,
  SlugRecord,
  SlugSummary
} from "../types";

function nowIso() {
  return new Date().toISOString();
}

function fallbackDestinationName(urlRaw: string) {
  try {
    const url = new URL(urlRaw);
    const path = url.pathname && url.pathname !== "/" ? url.pathname : "";
    return `${url.hostname}${path}` || urlRaw;
  } catch {
    return urlRaw;
  }
}

function makeId() {
  return `d_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
}

export function createMemoryKv(): KvStore {
  const slugs = new Map<string, SlugRecord>();
  const slugRawHits = new Map<string, number>();
  const slugClicks = new Map<string, number>();
  const destClicks = new Map<string, number>(); // key = `${slug}:${destId}`
  const rr = new Map<string, number>();
  const dedupe = new Map<string, number>(); // key = `${slug}:${fingerprint}` -> expiresAtMs
  const fallback = { html: null as string | null };

  function ensureSlug(slug: string) {
    const rec = slugs.get(slug);
    if (!rec) throw new Error("Slug not found.");
    return rec;
  }

  function keyDest(slug: string, destinationId: string) {
    return `${slug}:${destinationId}`;
  }

  return {
    async getRedirectConfig(slug: string) {
      const rec = slugs.get(slug);
      if (!rec) return null;
      return {
        enabled: rec.enabled,
        destinations: rec.destinations.map((d) => ({ id: d.id, urls: d.urls, enabled: d.enabled }))
      };
    },

    async nextRoundRobinCursor(slug: string) {
      const cur = rr.get(slug) ?? 0;
      rr.set(slug, cur + 1);
      return cur;
    },

    async recordRawHit(slug: string) {
      slugRawHits.set(slug, (slugRawHits.get(slug) ?? 0) + 1);
    },

    async acquireValidClickDedupe(slug: string, fingerprint: string, windowSeconds: number) {
      const ttlMs = Math.max(0, Math.floor(windowSeconds)) * 1000;
      if (!ttlMs) return true;
      const now = Date.now();
      const k = `${slug}:${fingerprint}`;
      const expiresAt = dedupe.get(k) ?? 0;
      if (expiresAt > now) return false;
      dedupe.set(k, now + ttlMs);
      return true;
    },

    async recordValidClick(slug: string, destinationId: string) {
      slugClicks.set(slug, (slugClicks.get(slug) ?? 0) + 1);
      const k = keyDest(slug, destinationId);
      destClicks.set(k, (destClicks.get(k) ?? 0) + 1);
    },

    async getSlug(slug: string) {
      return slugs.get(slug) ?? null;
    },

    async createSlug(input: CreateSlugInput) {
      if (slugs.has(input.slug)) throw new Error("Slug already exists.");

      const createdAt = nowIso();
      const destination: DestinationRecord = {
        id: makeId(),
        name: input.destinationName,
        urls: input.destinationUrls,
        enabled: true,
        createdAt
      };
      const rec: SlugRecord = {
        version: 3,
        slug: input.slug,
        enabled: true,
        createdAt,
        destinations: [destination]
      };

      slugs.set(input.slug, rec);
      slugRawHits.set(input.slug, slugRawHits.get(input.slug) ?? 0);
      slugClicks.set(input.slug, slugClicks.get(input.slug) ?? 0);
      destClicks.set(keyDest(input.slug, destination.id), destClicks.get(keyDest(input.slug, destination.id)) ?? 0);
      return rec;
    },

    async deleteSlug(slug: string) {
      slugs.delete(slug);
      slugRawHits.delete(slug);
      slugClicks.delete(slug);
      rr.delete(slug);
      for (const k of [...destClicks.keys()]) {
        if (k.startsWith(`${slug}:`)) destClicks.delete(k);
      }
      for (const k of [...dedupe.keys()]) {
        if (k.startsWith(`${slug}:`)) dedupe.delete(k);
      }
    },

    async listSlugs() {
      const out: SlugSummary[] = [];
      for (const rec of slugs.values()) {
        const enabledDestinationCount = rec.destinations.filter((d) => d.enabled).length;
        out.push({
          slug: rec.slug,
          enabled: rec.enabled,
          createdAt: rec.createdAt,
          totalClickCount: slugClicks.get(rec.slug) ?? 0,
          rawHitCount: slugRawHits.get(rec.slug) ?? 0,
          destinationCount: rec.destinations.length,
          enabledDestinationCount
        });
      }
      return out.sort((a, b) => a.slug.localeCompare(b.slug));
    },

    async setSlugEnabled(slug: string, enabled: boolean) {
      const rec = ensureSlug(slug);
      slugs.set(slug, { ...rec, enabled });
    },

    async resetSlugClickCount(slug: string) {
      slugRawHits.set(slug, 0);
      slugClicks.set(slug, 0);
      for (const k of destClicks.keys()) {
        if (k.startsWith(`${slug}:`)) destClicks.set(k, 0);
      }
    },

    async getSlugDetails(slug: string) {
      const rec = slugs.get(slug);
      if (!rec) return null;
      const destinations = rec.destinations.map((d) => ({
        ...d,
        clickCount: destClicks.get(keyDest(slug, d.id)) ?? 0
      }));
      const details: SlugDetails = {
        slug: rec.slug,
        enabled: rec.enabled,
        createdAt: rec.createdAt,
        totalClickCount: slugClicks.get(slug) ?? 0,
        rawHitCount: slugRawHits.get(slug) ?? 0,
        roundRobinCursor: Math.max(0, (rr.get(slug) ?? 0) - 1),
        destinations
      };
      return details;
    },

    async addDestination(input: AddDestinationInput) {
      const rec = ensureSlug(input.slug);
      const destination: DestinationRecord = {
        id: makeId(),
        name: input.name,
        urls: input.urls,
        enabled: true,
        createdAt: nowIso()
      };
      const next = { ...rec, destinations: [...rec.destinations, destination] };
      slugs.set(input.slug, next);
      destClicks.set(keyDest(input.slug, destination.id), destClicks.get(keyDest(input.slug, destination.id)) ?? 0);
      return next;
    },

    async editDestination(input: EditDestinationInput) {
      const rec = ensureSlug(input.slug);
      const next = {
        ...rec,
        destinations: rec.destinations.map((d) =>
          d.id === input.destinationId ? { ...d, name: input.name, urls: input.urls } : d
        )
      };
      slugs.set(input.slug, next);
      return next;
    },

    async setDestinationEnabled(input: SetDestinationEnabledInput) {
      const rec = ensureSlug(input.slug);
      const next = {
        ...rec,
        destinations: rec.destinations.map((d) =>
          d.id === input.destinationId ? { ...d, enabled: input.enabled } : d
        )
      };
      slugs.set(input.slug, next);
      return next;
    },

    async deleteDestination(input: DeleteDestinationInput) {
      const rec = ensureSlug(input.slug);
      const next = {
        ...rec,
        destinations: rec.destinations.filter((d) => d.id !== input.destinationId)
      };
      slugs.set(input.slug, next);
      destClicks.delete(keyDest(input.slug, input.destinationId));
      return next;
    },

    async resetDestinationClickCount(input: ResetDestinationClickCountInput) {
      ensureSlug(input.slug);
      destClicks.set(keyDest(input.slug, input.destinationId), 0);
    },

    async getFallbackHtml() {
      return fallback.html;
    },

    async setFallbackHtml(html: string) {
      fallback.html = html;
    }
  };
}
