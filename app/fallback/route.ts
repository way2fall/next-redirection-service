import { getKv } from "@/lib/storage";

export const runtime = "edge";

const DEFAULT_FALLBACK_HTML = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>链接不可用</title>
    <style>
      :root{color-scheme:dark;--bg:#07070a;--fg:rgba(255,255,255,.92);--mut:rgba(255,255,255,.62);--line:rgba(255,255,255,.14);--a:#f7c948;--b:#78e3ff}
      html,body{height:100%}
      body{margin:0;display:grid;place-items:center;background:
        radial-gradient(1200px 900px at 10% 10%, rgba(120,227,255,0.12), transparent 60%),
        radial-gradient(900px 700px at 90% 0%, rgba(247,201,72,0.10), transparent 55%),
        linear-gradient(180deg, var(--bg), #0c0d12);
        font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
        padding:24px}
      .card{width:min(720px,100%);border:1px solid var(--line);border-radius:18px;background:rgba(10,11,15,.68);
        box-shadow:0 24px 70px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.09);backdrop-filter:blur(10px);
        padding:18px 18px 16px}
      h1{margin:0 0 8px;font-size:22px;letter-spacing:-.02em}
      p{margin:0;color:var(--mut);line-height:1.55}
      .pill{display:inline-block;margin-top:12px;padding:4px 10px;border-radius:999px;border:1px solid var(--line);background:rgba(2,3,6,.42);color:var(--fg);font-size:12px}
      .hint{margin-top:10px;font-size:12px}
      a{color:var(--b);text-decoration:underline;text-decoration-color:rgba(120,227,255,.30);text-underline-offset:3px}
      .glow{height:1px;margin-top:14px;background:linear-gradient(90deg, transparent, rgba(247,201,72,.60), rgba(120,227,255,.50), transparent);opacity:.65}
    </style>
  </head>
  <body>
    <main class="card">
      <h1>链接不可用</h1>
      <p>该短链当前已停用，或没有任何启用的目标地址。</p>
      <div class="pill">短码：<span id="slug">{{slug}}</span></div>
      <p class="hint">如果你管理此链接，请打开 <a href="/admin">/admin</a> 重新启用。</p>
      <div class="glow" aria-hidden="true"></div>
    </main>
    <script>
      (function(){
        var s = new URLSearchParams(location.search).get('slug');
        if(s){ var el=document.getElementById('slug'); if(el) el.textContent=s; }
      })();
    </script>
  </body>
</html>`;

function fillPlaceholders(html: string, vars: Record<string, string>) {
  let out = html;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

export async function GET(request: Request) {
  const kv = getKv();
  const stored = await kv.getFallbackHtml();
  const html = stored && stored.trim().length ? stored : DEFAULT_FALLBACK_HTML;

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? "";
  const reason = url.searchParams.get("reason") ?? "";
  const filled = fillPlaceholders(html, { slug, reason });

  return new Response(filled, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
