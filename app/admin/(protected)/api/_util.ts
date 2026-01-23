import { isAdminAuthed } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireAdminJson() {
  if (!(await isAdminAuthed())) return jsonError("未登录。", 401);
  return null;
}

