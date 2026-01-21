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

export async function createSlug(formData: FormData) {
  await requireAdmin();
  const kv = getKv();

  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const destinationRaw = String(formData.get("destination") ?? "");

  if (!slug || !destinationRaw) redirect("/admin/links?error=Missing%20fields.");
  if (!isValidSlug(slug)) redirect("/admin/links?error=Invalid%20slug%20format.");
  if (isReservedSlug(slug)) redirect("/admin/links?error=Slug%20is%20reserved.");

  let destination: string;
  try {
    destination = validateDestination(destinationRaw);
  } catch {
    redirect("/admin/links?error=Invalid%20destination%20URL.");
  }

  let exists: Awaited<ReturnType<typeof kv.getSlug>> | null = null;
  try {
    exists = await kv.getSlug(slug);
  } catch (err) {
    redirect(`/admin/links?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  if (exists) redirect("/admin/links?error=Slug%20already%20exists.");

  try {
    await kv.createSlug({ slug, destinationUrl: destination });
  } catch (err) {
    redirect(`/admin/links?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links?created=${encodeURIComponent(slug)}`);
}

export async function deleteSlug(formData: FormData) {
  await requireAdmin();
  const kv = getKv();

  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  if (!slug) redirect("/admin/links?error=Missing%20slug.");

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
  if (!slug) redirect("/admin/links?error=Missing%20slug.");

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
  if (!slug) redirect("/admin/links?error=Missing%20slug.");

  try {
    await kv.resetSlugClickCount(slug);
  } catch (err) {
    redirect(`/admin/links?error=${encodeURIComponent(actionErrorMessage(err))}`);
  }
  redirect(`/admin/links?reset=${encodeURIComponent(slug)}`);
}
