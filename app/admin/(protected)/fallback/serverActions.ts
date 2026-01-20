"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getKv } from "@/lib/storage";

export async function saveFallback(formData: FormData) {
  await requireAdmin();
  const kv = getKv();
  const html = String(formData.get("html") ?? "");
  await kv.setFallbackHtml(html);
  redirect("/admin/fallback");
}

export async function resetFallback() {
  await requireAdmin();
  const kv = getKv();
  await kv.setFallbackHtml("");
  redirect("/admin/fallback");
}

