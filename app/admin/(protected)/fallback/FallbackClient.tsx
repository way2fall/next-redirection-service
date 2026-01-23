"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./fallback.module.css";

type Banner = { tone: "danger" | "ok"; mark: "!" | "↻"; text: string } | null;

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      ...(init?.headers ?? {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  if (res.status === 401) {
    location.assign("/admin/login");
    throw new Error("unauthorized");
  }

  if (!res.ok) {
    const json = await readJson<{ error?: string }>(res).catch(() => ({} as { error?: string }));
    throw new Error(json.error || "请求失败。");
  }

  return await readJson<T>(res);
}

export default function FallbackClient() {
  const [banner, setBanner] = useState<Banner>(null);
  const [html, setHtml] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    api<{ html: string }>("/admin/api/fallback")
      .then((data) => {
        setHtml(data.html);
        lastSavedRef.current = data.html;
        setLoaded(true);
      })
      .catch((err) => {
        setLoaded(true);
        setBanner({ tone: "danger", mark: "!", text: err instanceof Error ? err.message : "加载失败。" });
      });
  }, []);

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>斗篷页</h1>
          <p className={styles.sub}>
            对外公开访问路径为 <code className={styles.code}>/fallback</code>
            。可保存原始 HTML/CSS/JS。
          </p>
        </div>
        <div className={styles.headerActions}>
          <a className={styles.preview} href="/fallback" target="_blank" rel="noreferrer">
            预览
          </a>
          <button
            className={styles.reset}
            type="button"
            disabled={!loaded || saving}
            onClick={async () => {
              if (!confirm("确定恢复默认斗篷页吗？")) return;
              const snapshot = html;
              setBanner(null);
              setSaving(true);
              setHtml("");
              try {
                await api<{ ok: true }>("/admin/api/fallback", { method: "PUT", body: JSON.stringify({ html: "" }) });
                lastSavedRef.current = "";
                setBanner({ tone: "ok", mark: "↻", text: "已恢复默认斗篷页。" });
              } catch (err) {
                setHtml(snapshot);
                setBanner({ tone: "danger", mark: "!", text: err instanceof Error ? err.message : "恢复失败。" });
              } finally {
                setSaving(false);
              }
            }}
          >
            恢复默认
          </button>
        </div>
      </header>

      {banner ? (
        <div className={styles.banner} data-tone={banner.tone}>
          <span className={styles.bannerMark}>{banner.mark}</span>
          <span>{banner.text}</span>
        </div>
      ) : null}

      <div className={styles.form}>
        <textarea
          className={styles.textarea}
          name="html"
          spellCheck={false}
          placeholder="在此粘贴完整 HTML（<!doctype html> ...）。留空则使用内置默认页面。"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          disabled={!loaded || saving}
        />
        <div className={styles.footer}>
          <div className={styles.warn}>此 HTML 会公开对外提供。只粘贴你信任的代码。</div>
          <button
            className={styles.save}
            type="button"
            disabled={!loaded || saving || html === lastSavedRef.current}
            onClick={async () => {
              setBanner(null);
              setSaving(true);
              const next = html;
              try {
                await api<{ ok: true }>("/admin/api/fallback", { method: "PUT", body: JSON.stringify({ html: next }) });
                lastSavedRef.current = next;
                setBanner({ tone: "ok", mark: "↻", text: "已保存斗篷页。" });
              } catch (err) {
                setBanner({ tone: "danger", mark: "!", text: err instanceof Error ? err.message : "保存失败。" });
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </section>
  );
}
