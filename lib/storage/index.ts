import type { KvStore } from "./kv";
import { createMemoryKv } from "./providers/memory";
import { createUpstashRestKv } from "./providers/upstashRest";

let singleton: KvStore | null = null;

export function getKv(): KvStore {
  if (singleton) return singleton;
  const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  singleton = hasUpstash ? createUpstashRestKv() : createMemoryKv();
  return singleton;
}

