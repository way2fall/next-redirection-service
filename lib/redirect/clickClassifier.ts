const BOT_UA_SUBSTRINGS = [
  // Meta/Facebook link scrapers & debug tools (major source of inflated "clicks").
  "facebookexternalhit",
  "facebot",
  "metainspector",
  // Ad / search bots (high confidence).
  "adsbot",
  "googlebot",
  "bingbot"
] as const;

function hasControlChars(value: string) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    // Allow common whitespace; reject other ASCII control chars.
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) return true;
    if (code === 127) return true;
  }
  return false;
}

function acceptsHtml(headers: Headers) {
  const accept = headers.get("accept");
  if (!accept) return false;
  const v = accept.trim();
  if (!v || hasControlChars(v) || v.length > 2048) return false;
  const lower = v.toLowerCase();
  // Browsers navigating to a document almost always advertise HTML acceptance.
  return lower.includes("text/html") || lower.includes("application/xhtml+xml");
}

function isKnownBotUserAgent(userAgentLower: string) {
  return BOT_UA_SUBSTRINGS.some((s) => userAgentLower.includes(s));
}

function normalizeHeaderValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function firstForwardedIp(raw: string) {
  // X-Forwarded-For can be a list: "client, proxy1, proxy2".
  const first = raw.split(",")[0]?.trim() ?? "";
  return first && first.length <= 128 ? first : null;
}

function getClientIp(headers: Headers) {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const ip = firstForwardedIp(xff);
    if (ip) return ip;
  }

  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const ip = firstForwardedIp(vercel);
    if (ip) return ip;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp && realIp.length <= 128) return realIp;

  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf && cf.length <= 128) return cf;

  return null;
}

function fnv1a32Base36(input: string) {
  // Fast, non-cryptographic hash for short-lived dedupe keys (not fingerprinting).
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function shouldAdvanceRoundRobin(request: Request) {
  // Purpose: prevent prefetch/link-scrape traffic from affecting round-robin selection.
  if (request.method !== "GET") return false;
  const headers = request.headers;

  const purpose = (headers.get("purpose") ?? headers.get("sec-purpose") ?? "").toLowerCase();
  if (purpose.includes("prefetch")) return false;

  const nextRouterPrefetch = (headers.get("next-router-prefetch") ?? "").toLowerCase();
  if (nextRouterPrefetch === "1" || nextRouterPrefetch === "true") return false;

  const middlewarePrefetch = (headers.get("x-middleware-prefetch") ?? "").toLowerCase();
  if (middlewarePrefetch === "1" || middlewarePrefetch === "true") return false;

  const secFetchUser = headers.get("sec-fetch-user");
  if (secFetchUser && secFetchUser !== "?1") return false;

  const secFetchMode = headers.get("sec-fetch-mode");
  if (secFetchMode && secFetchMode !== "navigate") return false;

  const secFetchDest = headers.get("sec-fetch-dest");
  if (secFetchDest && secFetchDest !== "document") return false;

  return true;
}

export function isValidClickRequest(request: Request, opts?: { advanceRoundRobin?: boolean }) {
  // This is COUNTING ONLY; redirect behavior must never be blocked/changed.
  if (request.method !== "GET") return false; // HEAD/link-checkers inflate counts.

  const advanceRoundRobin = opts?.advanceRoundRobin ?? shouldAdvanceRoundRobin(request);
  if (!advanceRoundRobin) return false; // Prefetch/scrape traffic is not a business click.

  const headers = request.headers;
  const userAgent = headers.get("user-agent");
  if (!userAgent) return false; // Missing UA is a strong automation signal.
  const ua = normalizeHeaderValue(userAgent);
  if (!ua || hasControlChars(ua) || ua.length > 512) return false;

  const uaLower = ua.toLowerCase();
  if (isKnownBotUserAgent(uaLower)) return false;

  if (!acceptsHtml(headers)) return false; // Non-document fetches (images, HEAD probes, etc).

  return true;
}

export function getDedupeFingerprint(request: Request) {
  // Dedupe within a tiny window; this is not used to block, only to avoid double-counting retries.
  const headers = request.headers;
  const ip = getClientIp(headers);
  if (!ip) return null; // Fail open: if we can't reliably identify client IP, don't dedupe.

  const ua = headers.get("user-agent");
  if (!ua) return null;

  const normalized = `${ip}::${normalizeHeaderValue(ua).toLowerCase()}`;
  return fnv1a32Base36(normalized);
}

