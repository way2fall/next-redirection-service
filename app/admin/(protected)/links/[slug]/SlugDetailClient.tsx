"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./slug.module.css";
import tableStyles from "../links.module.css";
import CopyButton from "../CopyButton";
import DestinationActions from "./DestinationActions";
import type { DestinationWithClicks, SlugDetails } from "@/lib/storage/types";

type Banner = { tone: "danger" | "ok"; mark: "!" | "↻"; text: string } | null;

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

export default function SlugDetailClient({
  slug,
  initialBanner,
}: {
  slug: string;
  initialBanner: Banner;
}) {
  const router = useRouter();
  const [banner, setBanner] = useState<Banner>(initialBanner);
  const [details, setDetails] = useState<SlugDetails | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const addFormRef = useRef<HTMLFormElement | null>(null);

  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  async function refresh() {
    const data = await api<{ details: SlugDetails }>(`/admin/api/slugs/${encodeURIComponent(slug)}`);
    setDetails(data.details);
  }

  useEffect(() => {
    refresh().catch((err) => {
      const msg = err instanceof Error ? err.message : "加载失败。";
      if (msg.includes("未找到该短码")) {
        router.replace(`/admin/links?error=${encodeURIComponent("未找到该短码。")}`);
        return;
      }
      setBanner({ tone: "danger", mark: "!", text: msg });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (!details) {
    return (
      <div className={styles.grid}>
        <section className={tableStyles.panel}>
          <header className={tableStyles.panelHeader}>
            <h1 className={tableStyles.title}>加载中…</h1>
            <p className={tableStyles.sub}>正在读取配置与统计。</p>
          </header>
          {banner ? (
            <div className={tableStyles.banner} data-tone={banner.tone}>
              <span className={tableStyles.bannerMark}>{banner.mark}</span>
              <span>{banner.text}</span>
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  const shortUrl = baseUrl ? `${baseUrl}/${details.slug}` : `/${details.slug}`;

  return (
    <div className={styles.grid}>
      <aside className={tableStyles.panel}>
        <header className={tableStyles.panelHeader}>
          <h2 className={tableStyles.title} style={{ fontSize: 22 }}>
            添加目标地址
          </h2>
          <p className={tableStyles.sub}>启用后，新目标会立刻加入轮询。</p>
        </header>

        <form
          ref={addFormRef}
          className={tableStyles.form}
          onSubmit={async (e) => {
            e.preventDefault();
            if (busyKey) return;
            const fd = new FormData(e.currentTarget);
            const name = String(fd.get("name") ?? "");
            const urls = parseUrlLines(String(fd.get("url") ?? ""));
            setBusyKey("add");
            setBanner(null);
            try {
              const res = await api<{ destination: DestinationWithClicks }>(
                `/admin/api/slugs/${encodeURIComponent(details.slug)}/destinations`,
                { method: "POST", body: JSON.stringify({ name, urls }) }
              );
              setDetails((prev) =>
                prev ? { ...prev, destinations: [...prev.destinations, res.destination] } : prev
              );
              addFormRef.current?.reset();
              setBanner({ tone: "ok", mark: "↻", text: "已添加目标地址。" });
            } catch (err) {
              setBanner({
                tone: "danger",
                mark: "!",
                text: err instanceof Error ? err.message : "添加失败。",
              });
            } finally {
              setBusyKey(null);
            }
          }}
        >
          <label className={tableStyles.label}>
            <span className={tableStyles.labelText}>链接名称</span>
            <input
              className={tableStyles.input}
              name="name"
              placeholder="例如：工单 1 / 落地页 A"
              required
              disabled={busyKey === "add"}
            />
          </label>
          <label className={tableStyles.label}>
            <span className={tableStyles.labelText}>目标 URL（每行一个）</span>
            <textarea
              className={tableStyles.input}
              name="url"
              placeholder="https://example.com/landing"
              required
              rows={5}
              disabled={busyKey === "add"}
            />
          </label>
          <button className={tableStyles.create} type="submit" disabled={busyKey === "add"}>
            {busyKey === "add" ? "添加中…" : "添加"}
          </button>
        </form>

        <div className={tableStyles.note}>
          <div className={tableStyles.noteTitle}>斗篷页</div>
          <p className={tableStyles.noteText}>
            当链接被停用（或其中所有目标链接都停用）时，流量会重定向到{" "}
            <code className={tableStyles.code}>/fallback</code>。 该页面可在{" "}
            <Link className={tableStyles.destLink} href="/admin/fallback">
              管理端斗篷页编辑器
            </Link>
            中自定义。
          </p>
        </div>
      </aside>

      <section className={tableStyles.panel}>
        <header className={tableStyles.panelHeader}>
          <h1 className={tableStyles.title}>
            <code className={tableStyles.code}>/{details.slug}</code>
          </h1>
          <p className={tableStyles.sub}>
            对已启用的目标进行轮询重定向。停用该链接（或停用链接内所有目标链接）即可将流量发送到{" "}
            <code className={tableStyles.code}>/fallback</code>。
          </p>
        </header>

        {banner ? (
          <div className={tableStyles.banner} data-tone={banner.tone}>
            <span className={tableStyles.bannerMark}>{banner.mark}</span>
            <span>{banner.text}</span>
          </div>
        ) : null}

        <div className={styles.meta}>
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>重定向链接</div>
            <div className={styles.metaValue}>
              <a className={tableStyles.destLink} href={shortUrl} target="_blank" rel="noreferrer">
                {shortUrl}
              </a>
              <CopyButton text={shortUrl} />
            </div>
          </div>
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>创建时间</div>
            <div className={styles.metaValue}>{fmtDate(details.createdAt)}</div>
          </div>
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>有效点击</div>
            <div className={styles.metaValue}>{details.totalClickCount}</div>
          </div>
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>原始请求</div>
            <div className={styles.metaValue}>{details.rawHitCount}</div>
          </div>
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>轮询游标</div>
            <div className={styles.metaValue}>{details.roundRobinCursor}</div>
          </div>
          <div className={styles.metaActions}>
            <button
              className={`${tableStyles.toggle} ${details.enabled ? tableStyles.toggleOn : tableStyles.toggleOff}`}
              type="button"
              disabled={busyKey === "slug:enabled"}
              onClick={async () => {
                const snapshot = details;
                const nextEnabled = !details.enabled;
                setBusyKey("slug:enabled");
                setBanner(null);
                setDetails({ ...details, enabled: nextEnabled });
                try {
                  await api<{ ok: true }>(`/admin/api/slugs/${encodeURIComponent(details.slug)}/enabled`, {
                    method: "POST",
                    body: JSON.stringify({ enabled: nextEnabled }),
                  });
                  setBanner({ tone: "ok", mark: "↻", text: "已更新 slug。" });
                } catch (err) {
                  setDetails(snapshot);
                  setBanner({
                    tone: "danger",
                    mark: "!",
                    text: err instanceof Error ? err.message : "更新失败。",
                  });
                } finally {
                  setBusyKey(null);
                }
              }}
            >
              {details.enabled ? "启用中" : "停用中"}
            </button>
            <button
              className={`${tableStyles.actionBtn} ${tableStyles.reset}`}
              type="button"
              disabled={busyKey === "slug:reset"}
              onClick={async () => {
                const snapshot = details;
                setBusyKey("slug:reset");
                setBanner(null);
                setDetails({
                  ...details,
                  totalClickCount: 0,
                  rawHitCount: 0,
                  destinations: details.destinations.map((d) => ({ ...d, clickCount: 0 })),
                });
                try {
                  await api<{ ok: true }>(`/admin/api/slugs/${encodeURIComponent(details.slug)}/reset-clicks`, {
                    method: "POST",
                  });
                  setBanner({ tone: "ok", mark: "↻", text: "已重置 slug 点击数。" });
                } catch (err) {
                  setDetails(snapshot);
                  setBanner({
                    tone: "danger",
                    mark: "!",
                    text: err instanceof Error ? err.message : "重置失败。",
                  });
                } finally {
                  setBusyKey(null);
                }
              }}
            >
              重置点击数
            </button>
            <Link className={tableStyles.actionBtn} href="/admin/links">
              返回列表
            </Link>
          </div>
        </div>

        <div className={tableStyles.tableWrap}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>链接名称</th>
                <th>目标 URL</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>点击数</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {details.destinations.map((d) => {
                const rowBusy = busyKey === `dest:${d.id}`;
                return (
                  <tr key={d.id}>
                    <td>
                      <div>{d.name || "（未命名）"}</div>
                      <div className={styles.destId}>ID：{d.id}</div>
                    </td>
                    <td className={tableStyles.dest}>
                      <div className={styles.urlList}>
                        {d.urls.map((url, idx) => (
                          <a
                            key={`${idx}:${url}`}
                            className={tableStyles.destLink}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {url}
                          </a>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button
                        className={`${tableStyles.toggle} ${d.enabled ? tableStyles.toggleOn : tableStyles.toggleOff}`}
                        type="button"
                        disabled={rowBusy}
                        onClick={async () => {
                          const snapshot = details;
                          const nextEnabled = !d.enabled;
                          setBusyKey(`dest:${d.id}`);
                          setBanner(null);
                          setDetails({
                            ...details,
                            destinations: details.destinations.map((x) =>
                              x.id === d.id ? { ...x, enabled: nextEnabled } : x
                            ),
                          });

                          try {
                            await api<{ ok: true }>(
                              `/admin/api/slugs/${encodeURIComponent(details.slug)}/destinations/${encodeURIComponent(d.id)}/enabled`,
                              { method: "POST", body: JSON.stringify({ enabled: nextEnabled }) }
                            );
                            setBanner({ tone: "ok", mark: "↻", text: "已更新目标地址。" });
                          } catch (err) {
                            setDetails(snapshot);
                            setBanner({
                              tone: "danger",
                              mark: "!",
                              text: err instanceof Error ? err.message : "更新失败。",
                            });
                          } finally {
                            setBusyKey(null);
                          }
                        }}
                      >
                        {d.enabled ? "启用中" : "停用中"}
                      </button>
                    </td>
                    <td className={tableStyles.mono}>{fmtDate(d.createdAt)}</td>
                    <td className={tableStyles.mono}>{d.clickCount}</td>
                    <td className={tableStyles.actions}>
                      <DestinationActions
                        slug={details.slug}
                        destinationId={d.id}
                        name={d.name}
                        urls={d.urls}
                        disabled={rowBusy}
                        onReset={async () => {
                          const snapshot = details;
                          setBusyKey(`dest:${d.id}`);
                          setBanner(null);
                          setDetails({
                            ...details,
                            destinations: details.destinations.map((x) =>
                              x.id === d.id ? { ...x, clickCount: 0 } : x
                            ),
                          });

                          try {
                            await api<{ ok: true }>(
                              `/admin/api/slugs/${encodeURIComponent(details.slug)}/destinations/${encodeURIComponent(d.id)}/reset-clicks`,
                              { method: "POST" }
                            );
                            setBanner({ tone: "ok", mark: "↻", text: "已重置目标点击数。" });
                          } catch (err) {
                            setDetails(snapshot);
                            setBanner({
                              tone: "danger",
                              mark: "!",
                              text: err instanceof Error ? err.message : "重置失败。",
                            });
                          } finally {
                            setBusyKey(null);
                          }
                        }}
                        onDelete={async () => {
                          const snapshot = details;
                          setBusyKey(`dest:${d.id}`);
                          setBanner(null);
                          setDetails({
                            ...details,
                            destinations: details.destinations.filter((x) => x.id !== d.id),
                          });

                          try {
                            await api<{ ok: true }>(
                              `/admin/api/slugs/${encodeURIComponent(details.slug)}/destinations/${encodeURIComponent(d.id)}`,
                              { method: "DELETE" }
                            );
                            setBanner({ tone: "ok", mark: "↻", text: "已删除目标地址。" });
                          } catch (err) {
                            setDetails(snapshot);
                            setBanner({
                              tone: "danger",
                              mark: "!",
                              text: err instanceof Error ? err.message : "删除失败。",
                            });
                          } finally {
                            setBusyKey(null);
                          }
                        }}
                        onEdit={async (next) => {
                          const snapshot = details;
                          setBusyKey(`dest:${d.id}`);
                          setBanner(null);
                          setDetails({
                            ...details,
                            destinations: details.destinations.map((x) =>
                              x.id === d.id ? { ...x, name: next.name, urls: next.urls } : x
                            ),
                          });

                          try {
                            await api<{ ok: true }>(
                              `/admin/api/slugs/${encodeURIComponent(details.slug)}/destinations/${encodeURIComponent(d.id)}`,
                              { method: "PATCH", body: JSON.stringify({ name: next.name, urls: next.urls }) }
                            );
                            setBanner({ tone: "ok", mark: "↻", text: "已更新目标地址。" });
                          } catch (err) {
                            setDetails(snapshot);
                            setBanner({
                              tone: "danger",
                              mark: "!",
                              text: err instanceof Error ? err.message : "更新失败。",
                            });
                          } finally {
                            setBusyKey(null);
                          }
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
