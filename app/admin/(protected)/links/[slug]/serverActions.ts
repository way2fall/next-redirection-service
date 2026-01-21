"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getKv } from "@/lib/storage";

function actionErrorMessage(err: unknown) {
  const msg = err instanceof Error ? err.message : "";
  if (msg === "Slug already exists." || msg === "Slug not found." || msg === "Upstash env vars not configured.") return msg;
  return "Storage temporarily unavailable. Please try again.";
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
  if (!slug || !raw) redirect(`/admin/links/${encodeURIComponent(slug)}?error=Missing%20fields.`);

  let url: string;
  try {
    url = validateUrl(raw);
  } catch {
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=Invalid%20URL.`);
  }

  try {
    await kv.addDestination({ slug, url });
  } catch (err) {
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links/${encodeURIComponent(slug)}?updated=${encodeURIComponent("Destination added.")}`);
}

export async function editDestination(formData: FormData) {
  await requireAdmin();
  const kv = getKv();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const destinationId = String(formData.get("destinationId") ?? "");
  const raw = String(formData.get("url") ?? "");
  if (!slug || !destinationId || !raw) redirect(`/admin/links/${encodeURIComponent(slug)}?error=Missing%20fields.`);

  let url: string;
  try {
    url = validateUrl(raw);
  } catch {
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=Invalid%20URL.`);
  }

  try {
    await kv.editDestination({ slug, destinationId, url });
  } catch (err) {
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links/${encodeURIComponent(slug)}?updated=${encodeURIComponent("Destination updated.")}`);
}

export async function setDestinationEnabled(formData: FormData) {
  await requireAdmin();
  const kv = getKv();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const destinationId = String(formData.get("destinationId") ?? "");
  const enabledRaw = String(formData.get("enabled") ?? "");
  const enabled = enabledRaw === "1" || enabledRaw === "true";
  if (!slug || !destinationId) redirect(`/admin/links/${encodeURIComponent(slug)}?error=Missing%20fields.`);

  try {
    await kv.setDestinationEnabled({ slug, destinationId, enabled });
  } catch (err) {
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links/${encodeURIComponent(slug)}?updated=${encodeURIComponent("Destination updated.")}`);
}

export async function deleteDestination(formData: FormData) {
  await requireAdmin();
  const kv = getKv();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const destinationId = String(formData.get("destinationId") ?? "");
  if (!slug || !destinationId) redirect(`/admin/links/${encodeURIComponent(slug)}?error=Missing%20fields.`);

  try {
    await kv.deleteDestination({ slug, destinationId });
  } catch (err) {
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links/${encodeURIComponent(slug)}?updated=${encodeURIComponent("Destination deleted.")}`);
}

export async function resetDestinationClickCount(formData: FormData) {
  await requireAdmin();
  const kv = getKv();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const destinationId = String(formData.get("destinationId") ?? "");
  if (!slug || !destinationId) redirect(`/admin/links/${encodeURIComponent(slug)}?error=Missing%20fields.`);

  try {
    await kv.resetDestinationClickCount({ slug, destinationId });
  } catch (err) {
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links/${encodeURIComponent(slug)}?updated=${encodeURIComponent("Destination clicks reset.")}`);
}

export async function setSlugEnabled(formData: FormData) {
  await requireAdmin();
  const kv = getKv();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const enabledRaw = String(formData.get("enabled") ?? "");
  const enabled = enabledRaw === "1" || enabledRaw === "true";
  if (!slug) redirect(`/admin/links?error=Missing%20slug.`);

  try {
    await kv.setSlugEnabled(slug, enabled);
  } catch (err) {
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links/${encodeURIComponent(slug)}?updated=${encodeURIComponent("Slug updated.")}`);
}

export async function resetSlugClickCount(formData: FormData) {
  await requireAdmin();
  const kv = getKv();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  if (!slug) redirect(`/admin/links?error=Missing%20slug.`);

  try {
    await kv.resetSlugClickCount(slug);
  } catch (err) {
    redirect(`/admin/links/${encodeURIComponent(slug)}?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links/${encodeURIComponent(slug)}?updated=${encodeURIComponent("Slug clicks reset.")}`);
}
