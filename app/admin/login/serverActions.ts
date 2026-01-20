"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword } from "@/lib/auth/password";
import { getAdminEnv } from "@/lib/auth/env";
import { createAdminSessionCookie } from "@/lib/auth/session";

export async function login(formData: FormData) {
  const { ADMIN_USERNAME, ADMIN_PASSWORD_HASH } = getAdminEnv();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!username || !password || username !== ADMIN_USERNAME) {
    redirect("/admin/login?error=invalid");
  }

  const ok = await verifyPassword(password, ADMIN_PASSWORD_HASH);
  if (!ok) redirect("/admin/login?error=invalid");

  const cookie = createAdminSessionCookie(username);
  (await cookies()).set(cookie.name, cookie.value, cookie.options);
  redirect("/admin/links");
}

