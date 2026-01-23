import { getKv } from "@/lib/storage";
import { NextResponse } from "next/server";
import { jsonError, requireAdminJson } from "../_util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function actionErrorMessage(err: unknown) {
  const msg = err instanceof Error ? err.message : "";
  if (msg === "Slug already exists.") return "该短码已存在。";
  if (msg === "Slug not found.") return "未找到该短码。";
  if (msg === "Upstash env vars not configured.") return "未配置 Upstash 环境变量。";
  return "存储暂时不可用，请稍后再试。";
}

function normalizeSlug(raw: string) {
  return raw.trim().toLowerCase();
}

function isValidSlug(slug: string) {
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(slug);
}

function isReservedSlug(slug: string) {
  return (
    slug === "admin" ||
    slug === "api" ||
    slug === "_next" ||
    slug === "fallback" ||
    slug === "favicon.ico" ||
    slug === "robots.txt" ||
    slug === "sitemap.xml"
  );
}

function validateDestination(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Destination must be http(s).");
  }
  return url.toString();
}

function validateDestinations(raw: unknown) {
  const list = Array.isArray(raw) ? raw : [];
  const urls = list.map((s) => String(s ?? "").trim()).filter(Boolean);
  if (urls.length === 0) throw new Error("Missing destination.");
  return urls.map(validateDestination);
}

function validateDestinationName(raw: unknown) {
  const name = String(raw ?? "").trim();
  if (!name) throw new Error("Missing destination name.");
  if (name.length > 80) throw new Error("Destination name too long.");
  return name;
}

export async function GET() {
  const guard = await requireAdminJson();
  if (guard) return guard;

  try {
    const kv = getKv();
    const slugs = await kv.listSlugs();
    return NextResponse.json({ slugs });
  } catch (err) {
    return jsonError(actionErrorMessage(err), 500);
  }
}

export async function POST(req: Request) {
  const guard = await requireAdminJson();
  if (guard) return guard;

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return jsonError("请求格式无效。");
  }

  const slug = normalizeSlug(String(body?.slug ?? ""));
  if (!slug) return jsonError("缺少短码。");
  if (!isValidSlug(slug)) return jsonError("短码格式无效。");
  if (isReservedSlug(slug)) return jsonError("该短码为保留项。");

  let destinationName: string;
  try {
    destinationName = validateDestinationName(body?.destinationName);
  } catch {
    return jsonError("链接名称无效。");
  }

  let destinationUrls: string[];
  try {
    destinationUrls = validateDestinations(body?.destinationUrls);
  } catch {
    return jsonError("目标 URL 无效。");
  }

  try {
    const kv = getKv();
    const exists = await kv.getSlug(slug);
    if (exists) return jsonError("该短码已存在。");
    const created = await kv.createSlug({ slug, destinationName, destinationUrls });
    return NextResponse.json({ slug: created.slug }, { status: 201 });
  } catch (err) {
    return jsonError(actionErrorMessage(err), 500);
  }
}

