"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getKv } from "@/lib/storage";

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

function parseUrlLines(raw: string) {
  return raw
    .split(/\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function validateDestinations(raw: string) {
  const lines = parseUrlLines(raw);
  if (lines.length === 0) throw new Error("Missing destination.");
  return lines.map(validateDestination);
}

function validateDestinationName(raw: string) {
  const name = raw.trim();
  if (!name) throw new Error("Missing destination name.");
  if (name.length > 80) throw new Error("Destination name too long.");
  return name;
}

export async function createSlug(formData: FormData) {
  await requireAdmin();
  const kv = getKv();

  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const destinationNameRaw = String(formData.get("destinationName") ?? "");
  const destinationRaw = String(formData.get("destination") ?? "");

  if (!slug || !destinationNameRaw || !destinationRaw) redirect(`/admin/links?error=${encodeURIComponent("缺少字段。")}`);
  if (!isValidSlug(slug)) redirect(`/admin/links?error=${encodeURIComponent("短码格式无效。")}`);
  if (isReservedSlug(slug)) redirect(`/admin/links?error=${encodeURIComponent("该短码为保留项。")}`);

  let destinationName: string;
  try {
    destinationName = validateDestinationName(destinationNameRaw);
  } catch {
    redirect(`/admin/links?error=${encodeURIComponent("链接名称无效。")}`);
  }

  let destinationUrls: string[];
  try {
    destinationUrls = validateDestinations(destinationRaw);
  } catch {
    redirect(`/admin/links?error=${encodeURIComponent("目标 URL 无效。")}`);
  }

  let exists: Awaited<ReturnType<typeof kv.getSlug>> | null = null;
  try {
    exists = await kv.getSlug(slug);
  } catch (err) {
    redirect(`/admin/links?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  if (exists) redirect(`/admin/links?error=${encodeURIComponent("该短码已存在。")}`);

  try {
    await kv.createSlug({ slug, destinationName, destinationUrls });
  } catch (err) {
    redirect(`/admin/links?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links?created=${encodeURIComponent(slug)}`);
}

export async function deleteSlug(formData: FormData) {
  await requireAdmin();
  const kv = getKv();

  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  if (!slug) redirect(`/admin/links?error=${encodeURIComponent("缺少短码。")}`);

  try {
    await kv.deleteSlug(slug);
  } catch (err) {
    redirect(`/admin/links?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links?deleted=${encodeURIComponent(slug)}`);
}

export async function setSlugEnabled(formData: FormData) {
  await requireAdmin();
  const kv = getKv();

  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const enabledRaw = String(formData.get("enabled") ?? "");
  const enabled = enabledRaw === "1" || enabledRaw === "true";
  if (!slug) redirect(`/admin/links?error=${encodeURIComponent("缺少短码。")}`);

  try {
    await kv.setSlugEnabled(slug, enabled);
  } catch (err) {
    redirect(`/admin/links?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links?updated=${encodeURIComponent(slug)}`);
}

export async function resetSlugClickCount(formData: FormData) {
  await requireAdmin();
  const kv = getKv();

  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  if (!slug) redirect(`/admin/links?error=${encodeURIComponent("缺少短码。")}`);

  try {
    await kv.resetSlugClickCount(slug);
  } catch (err) {
    redirect(`/admin/links?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links?reset=${encodeURIComponent(slug)}`);
}
