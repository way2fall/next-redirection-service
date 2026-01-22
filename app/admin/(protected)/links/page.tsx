import styles from "./links.module.css";
import { getKv } from "@/lib/storage";
import {
  createSlug,
  deleteSlug,
  resetSlugClickCount,
  setSlugEnabled,
} from "./serverActions";
import { headers } from "next/headers";
import Link from "next/link";
import CopyButton from "./CopyButton";

export const runtime = "nodejs";

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN");
}

function normalizeBaseUrl(raw: string) {
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

async function getPublicBaseUrl() {
  const env = process.env.PUBLIC_BASE_URL;
  if (env) return normalizeBaseUrl(env);
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  return `${proto}://${host}`;
}

export default async function AdminLinksPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    deleted?: string;
    updated?: string;
    reset?: string;
    error?: string;
  }>;
}) {
  const kv = getKv();
  const slugs = await kv.listSlugs();
  const baseUrl = await getPublicBaseUrl();
  const { created, deleted, updated, reset, error } = await searchParams;

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

        <form className={styles.form} action={createSlug}>
          <label className={styles.label}>
            <span className={styles.labelText}>短码</span>
            <input
              className={styles.input}
              name="slug"
              placeholder="docs"
              required
            />
          </label>
          <label className={styles.label}>
            <span className={styles.labelText}>首个链接名称</span>
            <input
              className={styles.input}
              name="destinationName"
              placeholder="例如：工单 1 / 落地页 A"
              required
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
            />
          </label>
          <button className={styles.create} type="submit">
            创建链接
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

        {error ? (
          <div className={styles.banner} data-tone="danger">
            <span className={styles.bannerMark}>!</span>
            <span>{error}</span>
          </div>
        ) : created ? (
          <div className={styles.banner} data-tone="ok">
            <span className={styles.bannerMark}>+</span>
            <span>
              已创建 <code className={styles.code}>/{created}</code>
            </span>
          </div>
        ) : deleted ? (
          <div className={styles.banner} data-tone="ok">
            <span className={styles.bannerMark}>−</span>
            <span>
              已删除 <code className={styles.code}>/{deleted}</code>
            </span>
          </div>
        ) : updated ? (
          <div className={styles.banner} data-tone="ok">
            <span className={styles.bannerMark}>↻</span>
            <span>
              已更新 <code className={styles.code}>/{updated}</code>
            </span>
          </div>
        ) : reset ? (
          <div className={styles.banner} data-tone="ok">
            <span className={styles.bannerMark}>0</span>
            <span>
              已重置 <code className={styles.code}>/{reset}</code> 的点击数
            </span>
          </div>
        ) : null}

        <div className={styles.tableWrap}>
          {slugs.length === 0 ? (
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
                  <th>点击数</th>
                  <th>目标数</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slugs.map((s) => {
                  const shortUrl = baseUrl
                    ? `${baseUrl}/${s.slug}`
                    : `/${s.slug}`;
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
                        <form
                          action={setSlugEnabled}
                          className={styles.inlineForm}
                        >
                          <input type="hidden" name="slug" value={s.slug} />
                          <input
                            type="hidden"
                            name="enabled"
                            value={s.enabled ? "0" : "1"}
                          />
                          <button
                            className={`${styles.toggle} ${s.enabled ? styles.toggleOn : styles.toggleOff}`}
                            type="submit"
                          >
                            {s.enabled ? "启用中" : "停用中"}
                          </button>
                        </form>
                      </td>
                      <td className={styles.mono}>{fmtDate(s.createdAt)}</td>
                      <td className={styles.mono}>{s.totalClickCount}</td>
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
                          <form action={resetSlugClickCount}>
                            <input type="hidden" name="slug" value={s.slug} />
                            <button
                              className={`${styles.actionBtn} ${styles.reset}`}
                              type="submit"
                            >
                              重置
                            </button>
                          </form>
                          <form action={deleteSlug}>
                            <input type="hidden" name="slug" value={s.slug} />
                            <button
                              className={`${styles.actionBtn} ${styles.delete}`}
                              type="submit"
                            >
                              删除
                            </button>
                          </form>
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
