import { getKv } from "@/lib/storage";
import { NextResponse } from "next/server";
import { jsonError, requireAdminJson } from "../../../../_util";

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

function validateUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Destination must be http(s).");
  return url.toString();
}

function validateUrls(raw: unknown) {
  const list = Array.isArray(raw) ? raw : [];
  const urls = list.map((s) => String(s ?? "").trim()).filter(Boolean);
  if (urls.length === 0) throw new Error("Missing destination.");
  return urls.map(validateUrl);
}

function validateDestinationName(raw: unknown) {
  const name = String(raw ?? "").trim();
  if (!name) throw new Error("Missing destination name.");
  if (name.length > 80) throw new Error("Destination name too long.");
  return name;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string; destinationId: string }> }) {
  const guard = await requireAdminJson();
  if (guard) return guard;

  const { slug: rawSlug, destinationId } = await ctx.params;
  const slug = normalizeSlug(rawSlug);
  if (!slug || !destinationId) return jsonError("缺少字段。");

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return jsonError("请求格式无效。");
  }

  let name: string;
  try {
    name = validateDestinationName(body?.name);
  } catch {
    return jsonError("链接名称无效。");
  }

  let urls: string[];
  try {
    urls = validateUrls(body?.urls);
  } catch {
    return jsonError("URL 无效。");
  }

  try {
    const kv = getKv();
    await kv.editDestination({ slug, destinationId, name, urls });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(actionErrorMessage(err), 500);
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ slug: string; destinationId: string }> }) {
  const guard = await requireAdminJson();
  if (guard) return guard;

  const { slug: rawSlug, destinationId } = await ctx.params;
  const slug = normalizeSlug(rawSlug);
  if (!slug || !destinationId) return jsonError("缺少字段。");

  try {
    const kv = getKv();
    await kv.deleteDestination({ slug, destinationId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(actionErrorMessage(err), 500);
  }
}

