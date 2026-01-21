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

function validateUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Destination must be http(s).");
  return url.toString();
}

export async function addDestination(formData: FormData) {
  await requireAdmin();
  const kv = getKv();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const raw = String(formData.get("url") ?? "");
  if (!slug || !raw) redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent("缺少字段。")}`);

  let url: string;
  try {
    url = validateUrl(raw);
  } catch {
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent("URL 无效。")}`);
  }

  try {
    await kv.addDestination({ slug, url });
  } catch (err) {
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links/${encodeURIComponent(slug)}?updated=${encodeURIComponent("已添加目标地址。")}`);
}

export async function editDestination(formData: FormData) {
  await requireAdmin();
  const kv = getKv();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const destinationId = String(formData.get("destinationId") ?? "");
  const raw = String(formData.get("url") ?? "");
  if (!slug || !destinationId || !raw)
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent("缺少字段。")}`);

  let url: string;
  try {
    url = validateUrl(raw);
  } catch {
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent("URL 无效。")}`);
  }

  try {
    await kv.editDestination({ slug, destinationId, url });
  } catch (err) {
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links/${encodeURIComponent(slug)}?updated=${encodeURIComponent("已更新目标地址。")}`);
}

export async function setDestinationEnabled(formData: FormData) {
  await requireAdmin();
  const kv = getKv();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const destinationId = String(formData.get("destinationId") ?? "");
  const enabledRaw = String(formData.get("enabled") ?? "");
  const enabled = enabledRaw === "1" || enabledRaw === "true";
  if (!slug || !destinationId)
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent("缺少字段。")}`);

  try {
    await kv.setDestinationEnabled({ slug, destinationId, enabled });
  } catch (err) {
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links/${encodeURIComponent(slug)}?updated=${encodeURIComponent("已更新目标地址。")}`);
}

export async function deleteDestination(formData: FormData) {
  await requireAdmin();
  const kv = getKv();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const destinationId = String(formData.get("destinationId") ?? "");
  if (!slug || !destinationId)
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent("缺少字段。")}`);

  try {
    await kv.deleteDestination({ slug, destinationId });
  } catch (err) {
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links/${encodeURIComponent(slug)}?updated=${encodeURIComponent("已删除目标地址。")}`);
}

export async function resetDestinationClickCount(formData: FormData) {
  await requireAdmin();
  const kv = getKv();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const destinationId = String(formData.get("destinationId") ?? "");
  if (!slug || !destinationId)
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent("缺少字段。")}`);

  try {
    await kv.resetDestinationClickCount({ slug, destinationId });
  } catch (err) {
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links/${encodeURIComponent(slug)}?updated=${encodeURIComponent("已重置目标点击数。")}`);
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
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links/${encodeURIComponent(slug)}?updated=${encodeURIComponent("已更新 slug。")}`);
}

export async function resetSlugClickCount(formData: FormData) {
  await requireAdmin();
  const kv = getKv();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  if (!slug) redirect(`/admin/links?error=${encodeURIComponent("缺少短码。")}`);

  try {
    await kv.resetSlugClickCount(slug);
  } catch (err) {
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links/${encodeURIComponent(slug)}?updated=${encodeURIComponent("已重置 slug 点击数。")}`);
}
