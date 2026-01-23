import { getKv } from "@/lib/storage";
import { NextResponse } from "next/server";
import { jsonError, requireAdminJson } from "../_util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function actionErrorMessage(err: unknown) {
  const msg = err instanceof Error ? err.message : "";
  if (msg === "Upstash env vars not configured.") return "未配置 Upstash 环境变量。";
  return "存储暂时不可用，请稍后再试。";
}

export async function GET() {
  const guard = await requireAdminJson();
  if (guard) return guard;

  try {
    const kv = getKv();
    const html = (await kv.getFallbackHtml()) ?? "";
    return NextResponse.json({ html });
  } catch (err) {
    return jsonError(actionErrorMessage(err), 500);
  }
}

export async function PUT(req: Request) {
  const guard = await requireAdminJson();
  if (guard) return guard;

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return jsonError("请求格式无效。");
  }

  try {
    const kv = getKv();
    await kv.setFallbackHtml(String(body?.html ?? ""));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(actionErrorMessage(err), 500);
  }
}

