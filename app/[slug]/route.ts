import { NextResponse } from "next/server";
import { resolveRedirectForSlug } from "@/lib/redirect/resolve";
import { isValidClickRequest, shouldAdvanceRoundRobin } from "@/lib/redirect/clickClassifier";
import { scheduleRawHit, scheduleValidClick } from "@/lib/redirect/clickMetrics";

export const runtime = "edge";

function withNoStore(res: Response) {
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const slugKey = slug.trim().toLowerCase();
  const advanceRoundRobin = shouldAdvanceRoundRobin(request);
  const isValidClick = isValidClickRequest(request, { advanceRoundRobin });
  const reso = await resolveRedirectForSlug(slugKey, { track: advanceRoundRobin });

  if (reso.kind === "not_found") {
    return withNoStore(new Response("未找到", { status: 404 }));
  }

  if (reso.kind === "fallback") {
    scheduleRawHit(slugKey);
    const url = new URL("/fallback", request.url);
    url.searchParams.set("slug", slug);
    url.searchParams.set("reason", reso.reason);
    return withNoStore(NextResponse.redirect(url, { status: 302 }));
  }

  scheduleRawHit(slugKey);
  if (isValidClick) scheduleValidClick(slugKey, reso.destinationId, request);
  return withNoStore(NextResponse.redirect(reso.url, { status: 302 }));
}

export async function HEAD(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const slugKey = slug.trim().toLowerCase();
  const reso = await resolveRedirectForSlug(slugKey, { track: false });

  if (reso.kind === "not_found") return withNoStore(new Response(null, { status: 404 }));

  if (reso.kind === "fallback") {
    scheduleRawHit(slugKey);
    const url = new URL("/fallback", request.url);
    url.searchParams.set("slug", slug);
    url.searchParams.set("reason", reso.reason);
    return withNoStore(NextResponse.redirect(url, { status: 302 }));
  }

  scheduleRawHit(slugKey);
  return withNoStore(NextResponse.redirect(reso.url, { status: 302 }));
}
