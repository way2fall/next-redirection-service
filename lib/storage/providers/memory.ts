import type { KvStore } from "../kv";
import type { CreateLinkInput, LinkRecord } from "../types";

export function createMemoryKv(): KvStore {
  const links = new Map<string, Omit<LinkRecord, "clickCount">>();
  const clicks = new Map<string, number>();

  return {
    async getDestination(slug: string) {
      return links.get(slug)?.destination ?? null;
    },
    async getLink(slug: string) {
      const v = links.get(slug);
      if (!v) return null;
      return { ...v, clickCount: clicks.get(slug) ?? 0 };
    },
    async setLink(input: CreateLinkInput) {
      const now = new Date().toISOString();
      const rec: Omit<LinkRecord, "clickCount"> = {
        slug: input.slug,
        destination: input.destination,
        createdAt: now
      };
      links.set(input.slug, rec);
      clicks.set(input.slug, 0);
      return { ...rec, clickCount: 0 };
    },
    async deleteLink(slug: string) {
      links.delete(slug);
      clicks.delete(slug);
    },
    async incrementClick(slug: string) {
      clicks.set(slug, (clicks.get(slug) ?? 0) + 1);
    },
    async listLinks() {
      return [...links.values()]
        .map((r) => ({ ...r, clickCount: clicks.get(r.slug) ?? 0 }))
        .sort((a, b) => a.slug.localeCompare(b.slug));
    }
  };
}
