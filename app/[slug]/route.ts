import { NextResponse } from "next/server";
import { resolveDestinationForSlug } from "@/lib/redirect/resolve";

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } | Promise<{ slug: string }> }
) {
  const { slug } = await Promise.resolve(params);
  const destination = await resolveDestinationForSlug(slug);

  if (!destination) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" }
    });
  }

  const res = NextResponse.redirect(destination, { status: 302 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
