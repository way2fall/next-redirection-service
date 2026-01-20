import { isAdminAuthed } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export default async function AdminIndexPage() {
  redirect((await isAdminAuthed()) ? "/admin/links" : "/admin/login");
}

