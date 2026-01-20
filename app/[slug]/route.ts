import { NextResponse } from "next/server";
import { resolveRedirectForSlug } from "@/lib/redirect/resolve";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } | Promise<{ slug: string }> }
) {
  const { slug } = await Promise.resolve(params);
  const reso = await resolveRedirectForSlug(slug);

  if (reso.kind === "not_found") {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" }
    });
  }

  if (reso.kind === "fallback") {
    const url = new URL("/fallback", request.url);
    url.searchParams.set("slug", slug);
    url.searchParams.set("reason", reso.reason);
    const res = NextResponse.redirect(url, { status: 302 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  const res = NextResponse.redirect(reso.url, { status: 302 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
