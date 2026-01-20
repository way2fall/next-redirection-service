"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getKv } from "@/lib/storage";

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

export async function createLink(formData: FormData) {
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

  const exists = await kv.getDestination(slug);
  if (exists) redirect("/admin/links?error=Slug%20already%20exists.");

  await kv.setLink({ slug, destination });
  redirect(`/admin/links?created=${encodeURIComponent(slug)}`);
}

export async function deleteLink(formData: FormData) {
  await requireAdmin();
  const kv = getKv();

  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  if (!slug) redirect("/admin/links?error=Missing%20slug.");

  await kv.deleteLink(slug);
  redirect(`/admin/links?deleted=${encodeURIComponent(slug)}`);
}
