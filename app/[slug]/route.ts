import { NextResponse } from "next/server";
import { resolveRedirectForSlug } from "@/lib/redirect/resolve";

export const runtime = "edge";

function shouldCountRedirectClick(request: Request) {
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

function withNoStore(res: Response) {
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const reso = await resolveRedirectForSlug(slug, { track: shouldCountRedirectClick(request) });

  if (reso.kind === "not_found") {
    return withNoStore(new Response("Not found", { status: 404 }));
  }

  if (reso.kind === "fallback") {
    const url = new URL("/fallback", request.url);
    url.searchParams.set("slug", slug);
    url.searchParams.set("reason", reso.reason);
    return withNoStore(NextResponse.redirect(url, { status: 302 }));
  }

  return withNoStore(NextResponse.redirect(reso.url, { status: 302 }));
}

export async function HEAD(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const reso = await resolveRedirectForSlug(slug, { track: false });

  if (reso.kind === "not_found") return withNoStore(new Response(null, { status: 404 }));

  if (reso.kind === "fallback") {
    const url = new URL("/fallback", request.url);
    url.searchParams.set("slug", slug);
    url.searchParams.set("reason", reso.reason);
    return withNoStore(NextResponse.redirect(url, { status: 302 }));
  }

  return withNoStore(NextResponse.redirect(reso.url, { status: 302 }));
}
