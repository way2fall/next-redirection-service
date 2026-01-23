import { getKv } from "@/lib/storage";
import { NextResponse } from "next/server";
import { jsonError, requireAdminJson } from "../../../_util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeSlug(raw: string) {
  return raw.trim().toLowerCase();
}

function actionErrorMessage(err: unknown) {
  const msg = err instanceof Error ? err.message : "";
  if (msg === "Slug not found.") return "未找到该短码。";
  if (msg === "Upstash env vars not configured.") return "未配置 Upstash 环境变量。";
  return "存储暂时不可用，请稍后再试。";
}

export async function POST(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const guard = await requireAdminJson();
  if (guard) return guard;

  const { slug: raw } = await ctx.params;
  const slug = normalizeSlug(raw);
  if (!slug) return jsonError("缺少短码。");

  try {
    const kv = getKv();
    await kv.resetSlugClickCount(slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(actionErrorMessage(err), 500);
  }
}

