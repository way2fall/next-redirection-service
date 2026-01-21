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

type UpstashResponse<T> = { result: T; error?: string };

function getUpstashEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

function toPositiveInt(raw: string | undefined, fallback: number) {
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function isIdempotentCommand(cmdName: string) {
  const c = cmdName.toUpperCase();
  return c === "GET" || c === "MGET" || c === "SMEMBERS" || c === "SET" || c === "SADD" || c === "SREM" || c === "DEL";
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function getErrorCode(err: unknown) {
  const anyErr = err as any;
  return (anyErr?.cause?.code as string | undefined) ?? (anyErr?.code as string | undefined);
}

function isRetryableFetchError(err: unknown) {
  const anyErr = err as any;
  const code = getErrorCode(err);
  if (code) {
    return (
      code === "UND_ERR_CONNECT_TIMEOUT" ||
      code === "UND_ERR_CONNECT" ||
      code === "UND_ERR_SOCKET" ||
      code === "ECONNRESET" ||
      code === "ETIMEDOUT" ||
      code === "EAI_AGAIN" ||
      code === "ENOTFOUND" ||
      code === "ECONNREFUSED"
    );
  }
  if (anyErr?.name === "AbortError") return true;
  if (anyErr?.name === "TypeError" && typeof anyErr?.message === "string" && anyErr.message.includes("fetch failed")) {
    return true;
  }
  return false;
}

async function upstashFetch(url: string, init: RequestInit, opts: { retry: boolean }) {
  const timeoutMs = toPositiveInt(process.env.UPSTASH_FETCH_TIMEOUT_MS, 6500);
  const maxAttempts = opts.retry ? toPositiveInt(process.env.UPSTASH_FETCH_MAX_ATTEMPTS, 3) : 1;

  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const signal =
        opts.retry && timeoutMs > 0 && typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
          ? (AbortSignal as any).timeout(timeoutMs)
          : undefined;
      const res = await fetch(url, { ...init, signal });

      if (opts.retry && isRetryableStatus(res.status) && attempt < maxAttempts) {
        const backoffMs = Math.min(1500, 200 * 2 ** (attempt - 1));
        await sleep(backoffMs);
        continue;
      }

      return res;
    } catch (err) {
      lastErr = err;
      if (!opts.retry || attempt >= maxAttempts || !isRetryableFetchError(err)) throw err;
      const backoffMs = Math.min(1500, 200 * 2 ** (attempt - 1));
      await sleep(backoffMs);
    }
  }

  throw lastErr ?? new Error("Upstash fetch failed.");
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

function keyDestClicks(slug: string, destinationId: string) {
  return `${prefix()}:destClicks:${slug}:${destinationId}`;
}

function keyRoundRobin(slug: string) {
  return `${prefix()}:rr:${slug}`;
}

function keyIndex() {
  return `${prefix()}:links:index`;
}

function keyFallbackHtml() {
  return `${prefix()}:fallback:html`;
}

async function cmd<T>(args: Array<string | number>) {
  const env = getUpstashEnv();
  if (!env) throw new Error("Upstash env vars not configured.");

  const res = await upstashFetch(env.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(args),
    cache: "no-store"
  }, { retry: isIdempotentCommand(String(args[0] ?? "")) });

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

  const res = await upstashFetch(`${env.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(pipeline),
    cache: "no-store"
  }, { retry: pipeline.every((p) => isIdempotentCommand(String(p[0] ?? ""))) });

  if (!res.ok) {
    throw new Error(`Upstash pipeline error (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as Array<UpstashResponse<T>>;
  return json.map((r) => {
    if (r.error) throw new Error(`Upstash pipeline item error: ${r.error}`);
    return r.result;
  });
}

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `d_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
}

function parseSlugRecord(raw: string, fallbackSlug: string): SlugRecord | null {
  try {
    const parsed = JSON.parse(raw) as any;

    if (parsed?.version === 2 && typeof parsed?.slug === "string" && Array.isArray(parsed?.destinations)) {
      const destinations: DestinationRecord[] = parsed.destinations
        .map((d: any) => ({
          id: String(d?.id ?? ""),
          url: String(d?.url ?? ""),
          enabled: Boolean(d?.enabled),
          createdAt: typeof d?.createdAt === "string" ? d.createdAt : nowIso()
        }))
        .filter((d: DestinationRecord) => d.id && d.url);

      return {
        version: 2,
        slug: parsed.slug,
        enabled: Boolean(parsed.enabled),
        createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : nowIso(),
        destinations
      };
    }

    // Back-compat: v1 shape stored as { slug, destination, createdAt }.
    if (typeof parsed?.destination === "string") {
      const createdAt = typeof parsed?.createdAt === "string" ? parsed.createdAt : nowIso();
      return {
        version: 2,
        slug: typeof parsed?.slug === "string" ? parsed.slug : fallbackSlug,
        enabled: true,
        createdAt,
        destinations: [
          {
            id: "legacy",
            url: parsed.destination,
            enabled: true,
            createdAt
          }
        ]
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function getSlugRecord(slug: string) {
  const raw = await cmd<string | null>(["GET", keyLink(slug)]);
  if (!raw) return null;
  return parseSlugRecord(raw, slug);
}

async function putSlugRecord(rec: SlugRecord) {
  await cmdMany([
    ["SET", keyLink(rec.slug), JSON.stringify(rec)],
    ["SADD", keyIndex(), rec.slug]
  ]);
}

function toInt(raw: string | null) {
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function createUpstashRestKv(): KvStore {
  return {
    async getRedirectConfig(slug: string) {
      const rec = await getSlugRecord(slug);
      if (!rec) return null;
      return {
        enabled: rec.enabled,
        destinations: rec.destinations.map((d) => ({ id: d.id, url: d.url, enabled: d.enabled }))
      };
    },

    async nextRoundRobinCursor(slug: string) {
      const n = await cmd<number>(["INCR", keyRoundRobin(slug)]);
      const asNumber = Number(n);
      return Number.isFinite(asNumber) ? Math.max(0, asNumber - 1) : 0;
    },

    async recordClick(slug: string, destinationId: string) {
      await cmdMany([
        ["INCR", keyClicks(slug)],
        ["INCR", keyDestClicks(slug, destinationId)]
      ]);
    },

    async getSlug(slug: string) {
      return await getSlugRecord(slug);
    },

    async createSlug(input: CreateSlugInput) {
      const existing = await getSlugRecord(input.slug);
      if (existing) throw new Error("Slug already exists.");

      const createdAt = nowIso();
      const destination: DestinationRecord = {
        id: makeId(),
        url: input.destinationUrl,
        enabled: true,
        createdAt
      };
      const rec: SlugRecord = {
        version: 2,
        slug: input.slug,
        enabled: true,
        createdAt,
        destinations: [destination]
      };

      await cmdMany([
        ["SET", keyLink(input.slug), JSON.stringify(rec)],
        ["SADD", keyIndex(), input.slug],
        ["SET", keyClicks(input.slug), "0"],
        ["SET", keyDestClicks(input.slug, destination.id), "0"]
      ]);

      return rec;
    },

    async deleteSlug(slug: string) {
      const rec = await getSlugRecord(slug);
      const destKeys = rec ? rec.destinations.map((d) => keyDestClicks(slug, d.id)) : [];
      await cmdMany([
        ["DEL", keyLink(slug)],
        ["DEL", keyClicks(slug)],
        ["DEL", keyRoundRobin(slug)],
        ...destKeys.map((k) => ["DEL", k]),
        ["SREM", keyIndex(), slug]
      ]);
    },

    async listSlugs() {
      const slugs = await cmd<string[]>(["SMEMBERS", keyIndex()]);
      if (!slugs.length) return [];

      const linkKeys = slugs.map((s) => keyLink(s));
      const clickKeys = slugs.map((s) => keyClicks(s));

      const [rawLinks, rawClicks] = await Promise.all([
        cmd<Array<string | null>>(["MGET", ...linkKeys]),
        cmd<Array<string | null>>(["MGET", ...clickKeys])
      ]);

      const out: SlugSummary[] = [];
      for (let i = 0; i < slugs.length; i++) {
        const raw = rawLinks[i];
        if (!raw) continue;
        const rec = parseSlugRecord(raw, slugs[i]);
        if (!rec) continue;
        const enabledDestinationCount = rec.destinations.filter((d) => d.enabled).length;
        out.push({
          slug: rec.slug,
          enabled: rec.enabled,
          createdAt: rec.createdAt,
          totalClickCount: toInt(rawClicks[i]),
          destinationCount: rec.destinations.length,
          enabledDestinationCount
        });
      }

      return out.sort((a, b) => a.slug.localeCompare(b.slug));
    },

    async setSlugEnabled(slug: string, enabled: boolean) {
      const rec = await getSlugRecord(slug);
      if (!rec) throw new Error("Slug not found.");
      await putSlugRecord({ ...rec, enabled });
    },

    async resetSlugClickCount(slug: string) {
      const rec = await getSlugRecord(slug);
      const destKeys = rec ? rec.destinations.map((d) => keyDestClicks(slug, d.id)) : [];
      await cmdMany([["SET", keyClicks(slug), "0"], ...destKeys.map((k) => ["SET", k, "0"])]);
    },

    async getSlugDetails(slug: string) {
      const rec = await getSlugRecord(slug);
      if (!rec) return null;

      const destKeys = rec.destinations.map((d) => keyDestClicks(slug, d.id));
      const [totalStr, rrStr, destCounts] = await Promise.all([
        cmd<string | null>(["GET", keyClicks(slug)]),
        cmd<string | null>(["GET", keyRoundRobin(slug)]),
        destKeys.length
          ? cmd<Array<string | null>>(["MGET", ...destKeys])
          : Promise.resolve<Array<string | null>>([])
      ]);

      const destinations = rec.destinations.map((d, i) => ({
        ...d,
        clickCount: toInt(destCounts[i] ?? null)
      }));

      const details: SlugDetails = {
        slug: rec.slug,
        enabled: rec.enabled,
        createdAt: rec.createdAt,
        totalClickCount: toInt(totalStr),
        roundRobinCursor: Math.max(0, toInt(rrStr) - 1),
        destinations
      };
      return details;
    },

    async addDestination(input: AddDestinationInput) {
      const rec = await getSlugRecord(input.slug);
      if (!rec) throw new Error("Slug not found.");

      const destination: DestinationRecord = {
        id: makeId(),
        url: input.url,
        enabled: true,
        createdAt: nowIso()
      };
      const next: SlugRecord = { ...rec, destinations: [...rec.destinations, destination] };

      await cmdMany([
        ["SET", keyLink(input.slug), JSON.stringify(next)],
        ["SADD", keyIndex(), input.slug],
        ["SET", keyDestClicks(input.slug, destination.id), "0"]
      ]);
      return next;
    },

    async editDestination(input: EditDestinationInput) {
      const rec = await getSlugRecord(input.slug);
      if (!rec) throw new Error("Slug not found.");

      const next: SlugRecord = {
        ...rec,
        destinations: rec.destinations.map((d) => (d.id === input.destinationId ? { ...d, url: input.url } : d))
      };

      await putSlugRecord(next);
      return next;
    },

    async setDestinationEnabled(input: SetDestinationEnabledInput) {
      const rec = await getSlugRecord(input.slug);
      if (!rec) throw new Error("Slug not found.");

      const next: SlugRecord = {
        ...rec,
        destinations: rec.destinations.map((d) =>
          d.id === input.destinationId ? { ...d, enabled: input.enabled } : d
        )
      };

      await putSlugRecord(next);
      return next;
    },

    async deleteDestination(input: DeleteDestinationInput) {
      const rec = await getSlugRecord(input.slug);
      if (!rec) throw new Error("Slug not found.");

      const next: SlugRecord = {
        ...rec,
        destinations: rec.destinations.filter((d) => d.id !== input.destinationId)
      };

      await cmdMany([
        ["SET", keyLink(input.slug), JSON.stringify(next)],
        ["SADD", keyIndex(), input.slug],
        ["DEL", keyDestClicks(input.slug, input.destinationId)]
      ]);
      return next;
    },

    async resetDestinationClickCount(input: ResetDestinationClickCountInput) {
      const rec = await getSlugRecord(input.slug);
      if (!rec) throw new Error("Slug not found.");
      await cmd(["SET", keyDestClicks(input.slug, input.destinationId), "0"]);
    },

    async getFallbackHtml() {
      return await cmd<string | null>(["GET", keyFallbackHtml()]);
    },

    async setFallbackHtml(html: string) {
      await cmd(["SET", keyFallbackHtml(), html]);
    }
  };
}
