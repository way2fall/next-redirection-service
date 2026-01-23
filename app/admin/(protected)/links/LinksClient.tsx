"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./links.module.css";
import CopyButton from "./CopyButton";
import type { SlugSummary } from "@/lib/storage/types";

type Banner =
  | { tone: "danger"; mark: "!"; text: string }
  | { tone: "ok"; mark: "+" | "−" | "↻" | "0"; text: string };

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN");
}

function parseUrlLines(raw: string) {
  return raw
    .split(/\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

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

export default function LinksClient({
  initialBanner,
}: {
  initialBanner: Banner | null;
}) {
  const [banner, setBanner] = useState<Banner | null>(initialBanner);
  const [slugs, setSlugs] = useState<SlugSummary[] | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  async function refresh() {
    const data = await api<{ slugs: SlugSummary[] }>("/admin/api/slugs");
    setSlugs(data.slugs);
  }

  useEffect(() => {
    refresh().catch((err) => {
      setBanner({ tone: "danger", mark: "!", text: err instanceof Error ? err.message : "加载失败。" });
      setSlugs([]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.grid}>
      <aside className={styles.panel}>
        <header className={styles.panelHeader}>
          <h2 className={styles.title} style={{ fontSize: 22 }}>
            创建短链
          </h2>
          <p className={styles.sub}>
            slug 会自动转为小写。仅允许字母、数字、“-”、“_”。
          </p>
        </header>

        <form
          ref={formRef}
          className={styles.form}
          onSubmit={async (e) => {
            e.preventDefault();
            if (creating) return;

            const fd = new FormData(e.currentTarget);
            const slug = String(fd.get("slug") ?? "");
            const destinationName = String(fd.get("destinationName") ?? "");
            const destinationRaw = String(fd.get("destination") ?? "");
            const destinationUrls = parseUrlLines(destinationRaw);

            setCreating(true);
            setBanner(null);
            try {
              const res = await api<{ slug: string }>("/admin/api/slugs", {
                method: "POST",
                body: JSON.stringify({ slug, destinationName, destinationUrls }),
              });
              setBanner({ tone: "ok", mark: "+", text: `已创建 /${res.slug}` });
              formRef.current?.reset();
              await refresh();
            } catch (err) {
              setBanner({
                tone: "danger",
                mark: "!",
                text: err instanceof Error ? err.message : "创建失败。",
              });
            } finally {
              setCreating(false);
            }
          }}
        >
          <label className={styles.label}>
            <span className={styles.labelText}>短码</span>
            <input
              className={styles.input}
              name="slug"
              placeholder="docs"
              required
              disabled={creating}
            />
          </label>
          <label className={styles.label}>
            <span className={styles.labelText}>首个链接名称</span>
            <input
              className={styles.input}
              name="destinationName"
              placeholder="例如：工单 1 / 落地页 A"
              required
              disabled={creating}
            />
          </label>
          <label className={styles.label}>
            <span className={styles.labelText}>首个目标 URL（每行一个）</span>
            <textarea
              className={styles.input}
              name="destination"
              placeholder="https://example.com/somewhere"
              required
              rows={4}
              disabled={creating}
            />
          </label>
          <button className={styles.create} type="submit" disabled={creating}>
            {creating ? "创建中…" : "创建链接"}
          </button>
        </form>

        <div className={styles.note}>
          <div className={styles.noteTitle}>性能边界</div>
          <p className={styles.noteText}>
            重定向在 <span className={styles.pill}>Edge</span> 上完成：1 次 KV
            读取 + 1 次 KV 计数器递增（轮询）。
            统计计数为异步处理，不会阻塞重定向。
          </p>
        </div>
      </aside>

      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <h1 className={styles.title}>短链列表</h1>
          <p className={styles.sub}>
            每个 slug 可配置多个目标地址，并通过轮询路由（Edge 302）。
          </p>
        </header>

        {banner ? (
          <div className={styles.banner} data-tone={banner.tone}>
            <span className={styles.bannerMark}>{banner.mark}</span>
            <span>{banner.text}</span>
          </div>
        ) : null}

        <div className={styles.tableWrap}>
          {slugs === null ? (
            <div className={styles.empty}>加载中…</div>
          ) : slugs.length === 0 ? (
            <div className={styles.empty}>
              暂无 slug。请在左侧创建你的第一个短链。
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>短码</th>
                  <th>重定向链接</th>
                  <th>状态</th>
                  <th>创建时间</th>
                  <th>有效点击</th>
                  <th>原始请求</th>
                  <th>目标数</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slugs.map((s) => {
                  const shortUrl = baseUrl ? `${baseUrl}/${s.slug}` : `/${s.slug}`;
                  const busy = busySlug === s.slug;

                  return (
                    <tr key={s.slug}>
                      <td>
                        <code className={styles.code}>/{s.slug}</code>
                      </td>
                      <td className={styles.dest}>
                        <div className={styles.linkCell}>
                          <a
                            className={styles.destLink}
                            href={shortUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {shortUrl}
                          </a>
                          <CopyButton text={shortUrl} />
                        </div>
                      </td>
                      <td>
                        <button
                          className={`${styles.toggle} ${s.enabled ? styles.toggleOn : styles.toggleOff}`}
                          type="button"
                          disabled={busy}
                          onClick={async () => {
                            const snapshot = slugs;
                            if (!snapshot) return;
                            const nextEnabled = !s.enabled;
                            setBusySlug(s.slug);
                            setBanner(null);
                            setSlugs(snapshot.map((x) => (x.slug === s.slug ? { ...x, enabled: nextEnabled } : x)));

                            try {
                              await api<{ ok: true }>(`/admin/api/slugs/${encodeURIComponent(s.slug)}/enabled`, {
                                method: "POST",
                                body: JSON.stringify({ enabled: nextEnabled }),
                              });
                              setBanner({ tone: "ok", mark: "↻", text: `已更新 /${s.slug}` });
                            } catch (err) {
                              setSlugs(snapshot);
                              setBanner({
                                tone: "danger",
                                mark: "!",
                                text: err instanceof Error ? err.message : "更新失败。",
                              });
                            } finally {
                              setBusySlug(null);
                            }
                          }}
                        >
                          {s.enabled ? "启用中" : "停用中"}
                        </button>
                      </td>
                      <td className={styles.mono}>{fmtDate(s.createdAt)}</td>
                      <td className={styles.mono}>{s.totalClickCount}</td>
                      <td className={styles.mono}>{s.rawHitCount}</td>
                      <td className={styles.mono}>
                        {s.enabledDestinationCount}/{s.destinationCount}
                      </td>
                      <td className={styles.actions}>
                        <div className={styles.actionRow}>
                          <Link
                            className={styles.actionBtn}
                            href={`/admin/links/${encodeURIComponent(s.slug)}`}
                          >
                            管理
                          </Link>
                          <button
                            className={`${styles.actionBtn} ${styles.reset}`}
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                              const snapshot = slugs;
                              if (!snapshot) return;
                              setBusySlug(s.slug);
                              setBanner(null);
                              setSlugs(
                                snapshot.map((x) =>
                                  x.slug === s.slug ? { ...x, totalClickCount: 0, rawHitCount: 0 } : x
                                )
                              );
                              try {
                                await api<{ ok: true }>(
                                  `/admin/api/slugs/${encodeURIComponent(s.slug)}/reset-clicks`,
                                  { method: "POST" }
                                );
                                setBanner({ tone: "ok", mark: "0", text: `已重置 /${s.slug} 的点击数` });
                              } catch (err) {
                                setSlugs(snapshot);
                                setBanner({
                                  tone: "danger",
                                  mark: "!",
                                  text: err instanceof Error ? err.message : "重置失败。",
                                });
                              } finally {
                                setBusySlug(null);
                              }
                            }}
                          >
                            重置
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.delete}`}
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                              if (!confirm("确定删除这个短码吗？")) return;
                              const snapshot = slugs;
                              if (!snapshot) return;
                              setBusySlug(s.slug);
                              setBanner(null);
                              setSlugs(snapshot.filter((x) => x.slug !== s.slug));
                              try {
                                await api<{ ok: true }>(`/admin/api/slugs/${encodeURIComponent(s.slug)}`, {
                                  method: "DELETE",
                                });
                                setBanner({ tone: "ok", mark: "−", text: `已删除 /${s.slug}` });
                              } catch (err) {
                                setSlugs(snapshot);
                                setBanner({
                                  tone: "danger",
                                  mark: "!",
                                  text: err instanceof Error ? err.message : "删除失败。",
                                });
                              } finally {
                                setBusySlug(null);
                              }
                            }}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
