import { after } from "next/server";
import { getKv } from "@/lib/storage";
import { getDedupeFingerprint } from "./clickClassifier";

function toPositiveInt(raw: string | undefined, fallback: number) {
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function getValidClickDedupeWindowSeconds() {
  // Tiny window to ignore immediate retries (common with ad platform scrapers and flaky networks).
  return toPositiveInt(process.env.CLICK_DEDUPE_WINDOW_SECONDS, 3);
}

export function scheduleRawHit(slug: string) {
  try {
    after(() => {
      const kv = getKv();
      return kv.recordRawHit(slug).catch(() => {});
    });
  } catch {
    // Never let metrics affect redirects.
  }
}

export function scheduleValidClick(slug: string, destinationId: string, request: Request) {
  try {
    after(async () => {
      const kv = getKv();

      const windowSeconds = getValidClickDedupeWindowSeconds();
      const fingerprint = windowSeconds > 0 ? getDedupeFingerprint(request) : null;

      if (fingerprint) {
        // NX+EX prevents double counting without any read in the redirect path.
        const firstInWindow = await kv.acquireValidClickDedupe(slug, fingerprint, windowSeconds).catch(() => true);
        if (!firstInWindow) return;
      }

      await kv.recordValidClick(slug, destinationId).catch(() => {});
    });
  } catch {
    // Never let metrics affect redirects.
  }
}
