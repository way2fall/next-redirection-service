"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clearAdminSessionCookie } from "@/lib/auth/session";

export async function logout() {
  const cookie = clearAdminSessionCookie();
  (await cookies()).set(cookie.name, cookie.value, cookie.options);
  redirect("/admin/login");
}

