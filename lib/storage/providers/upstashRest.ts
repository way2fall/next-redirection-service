import type { KvStore } from "../kv";
import type { CreateLinkInput, LinkRecord } from "../types";

type UpstashResponse<T> = { result: T; error?: string };

function getUpstashEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

function prefix() {
  return process.env.KV_PREFIX?.trim() ? process.env.KV_PREFIX!.trim() : "nrs";
}

function keyLink(slug: string) {
  return `${prefix()}:link:${slug}`;
}

function keyClicks(slug: string) {
  return `${prefix()}:clicks:${slug}`;
}

function keyIndex() {
  return `${prefix()}:links:index`;
}

async function cmd<T>(args: Array<string | number>) {
  const env = getUpstashEnv();
  if (!env) throw new Error("Upstash env vars not configured.");

  const res = await fetch(env.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(args),
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`Upstash error (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as UpstashResponse<T>;
  if (json.error) throw new Error(`Upstash command error: ${json.error}`);
  return json.result;
}

async function cmdMany<T>(pipeline: Array<Array<string | number>>) {
  const env = getUpstashEnv();
  if (!env) throw new Error("Upstash env vars not configured.");

  const res = await fetch(`${env.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(pipeline),
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`Upstash pipeline error (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as Array<UpstashResponse<T>>;
  return json.map((r) => {
    if (r.error) throw new Error(`Upstash pipeline item error: ${r.error}`);
    return r.result;
  });
}

export function createUpstashRestKv(): KvStore {
  return {
    async getDestination(slug: string) {
      const raw = await cmd<string | null>(["GET", keyLink(slug)]);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as Pick<LinkRecord, "destination">;
        return typeof parsed?.destination === "string" ? parsed.destination : null;
      } catch {
        return null;
      }
    },

    async getLink(slug) {
      const [raw, clicksStr] = await cmdMany<string | null>([
        ["GET", keyLink(slug)],
        ["GET", keyClicks(slug)]
      ]);
      if (!raw) return null;

      try {
        const parsed = JSON.parse(raw) as Omit<LinkRecord, "clickCount">;
        const clickCount = clicksStr ? Number(clicksStr) : 0;
        return { ...parsed, clickCount: Number.isFinite(clickCount) ? clickCount : 0 };
      } catch {
        return null;
      }
    },

    async setLink(input: CreateLinkInput) {
      const now = new Date().toISOString();
      const rec: Omit<LinkRecord, "clickCount"> = {
        slug: input.slug,
        destination: input.destination,
        createdAt: now
      };

      await cmdMany([
        ["SET", keyLink(input.slug), JSON.stringify(rec)],
        ["SET", keyClicks(input.slug), "0"],
        ["SADD", keyIndex(), input.slug]
      ]);

      return { ...rec, clickCount: 0 };
    },

    async deleteLink(slug: string) {
      await cmdMany([
        ["DEL", keyLink(slug)],
        ["DEL", keyClicks(slug)],
        ["SREM", keyIndex(), slug]
      ]);
    },

    async incrementClick(slug: string) {
      await cmd<number>(["INCR", keyClicks(slug)]);
    },

    async listLinks() {
      const slugs = await cmd<string[]>(["SMEMBERS", keyIndex()]);
      if (!slugs.length) return [];

      const linkKeys = slugs.map((s) => keyLink(s));
      const clickKeys = slugs.map((s) => keyClicks(s));

      const [rawLinks, rawClicks] = await Promise.all([
        cmd<Array<string | null>>(["MGET", ...linkKeys]),
        cmd<Array<string | null>>(["MGET", ...clickKeys])
      ]);

      const out: LinkRecord[] = [];
      for (let i = 0; i < slugs.length; i++) {
        const raw = rawLinks[i];
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as Omit<LinkRecord, "clickCount">;
          const clickCount = rawClicks[i] ? Number(rawClicks[i]) : 0;
          out.push({
            ...parsed,
            clickCount: Number.isFinite(clickCount) ? clickCount : 0
          });
        } catch {
          // ignore malformed entries
        }
      }

      return out.sort((a, b) => a.slug.localeCompare(b.slug));
    }
  };
}
