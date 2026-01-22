import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import styles from "./slug.module.css";
import tableStyles from "../links.module.css";
import CopyButton from "../CopyButton";
import { getKv } from "@/lib/storage";
import {
  addDestination,
  setDestinationEnabled,
  setSlugEnabled,
  resetSlugClickCount,
} from "./serverActions";
import DestinationActions from "./DestinationActions";

export const runtime = "nodejs";

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

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN");
}

export default async function SlugDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const { slug } = await params;
  const { error, updated } = await searchParams;
  const kv = getKv();
  const details = await kv.getSlugDetails(slug);
  if (!details)
    redirect(`/admin/links?error=${encodeURIComponent("未找到该短码。")}`);

  const baseUrl = await getPublicBaseUrl();
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

        <form className={tableStyles.form} action={addDestination}>
          <input type="hidden" name="slug" value={details.slug} />
          <label className={tableStyles.label}>
            <span className={tableStyles.labelText}>链接名称</span>
            <input
              className={tableStyles.input}
              name="name"
              placeholder="例如：工单 1 / 落地页 A"
              required
            />
          </label>
          <label className={tableStyles.label}>
            <span className={tableStyles.labelText}>目标 URL</span>
            <input
              className={tableStyles.input}
              name="url"
              placeholder="https://example.com/landing"
              required
            />
          </label>
          <button className={tableStyles.create} type="submit">
            添加
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
            对已启用的目标进行轮询重定向。停用该
            链接（或停用链接内所有目标链接）即可将流量发送到{" "}
            <code className={tableStyles.code}>/fallback</code>。
          </p>
        </header>

        {error ? (
          <div className={tableStyles.banner} data-tone="danger">
            <span className={tableStyles.bannerMark}>!</span>
            <span>{error}</span>
          </div>
        ) : updated ? (
          <div className={tableStyles.banner} data-tone="ok">
            <span className={tableStyles.bannerMark}>↻</span>
            <span>{updated}</span>
          </div>
        ) : null}

        <div className={styles.meta}>
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>重定向链接</div>
            <div className={styles.metaValue}>
              <a
                className={tableStyles.destLink}
                href={shortUrl}
                target="_blank"
                rel="noreferrer"
              >
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
            <div className={styles.metaLabel}>总点击数</div>
            <div className={styles.metaValue}>{details.totalClickCount}</div>
          </div>
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>轮询游标</div>
            <div className={styles.metaValue}>{details.roundRobinCursor}</div>
          </div>
          <div className={styles.metaActions}>
            <form action={setSlugEnabled} className={tableStyles.inlineForm}>
              <input type="hidden" name="slug" value={details.slug} />
              <input
                type="hidden"
                name="enabled"
                value={details.enabled ? "0" : "1"}
              />
              <button
                className={`${tableStyles.toggle} ${details.enabled ? tableStyles.toggleOn : tableStyles.toggleOff}`}
                type="submit"
              >
                {details.enabled ? "启用" : "停用"}
              </button>
            </form>
            <form action={resetSlugClickCount}>
              <input type="hidden" name="slug" value={details.slug} />
              <button
                className={`${tableStyles.actionBtn} ${tableStyles.reset}`}
                type="submit"
              >
                重置点击数
              </button>
            </form>
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
              {details.destinations.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div>{d.name || "（未命名）"}</div>
                    <div className={styles.destId}>ID：{d.id}</div>
                  </td>
                  <td className={tableStyles.dest}>
                    <a
                      className={tableStyles.destLink}
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {d.url}
                    </a>
                  </td>
                  <td>
                    <form
                      action={setDestinationEnabled}
                      className={tableStyles.inlineForm}
                    >
                      <input type="hidden" name="slug" value={details.slug} />
                      <input type="hidden" name="destinationId" value={d.id} />
                      <input
                        type="hidden"
                        name="enabled"
                        value={d.enabled ? "0" : "1"}
                      />
                      <button
                        className={`${tableStyles.toggle} ${d.enabled ? tableStyles.toggleOn : tableStyles.toggleOff}`}
                        type="submit"
                      >
                        {d.enabled ? "启用" : "停用"}
                      </button>
                    </form>
                  </td>
                  <td className={tableStyles.mono}>{fmtDate(d.createdAt)}</td>
                  <td className={tableStyles.mono}>{d.clickCount}</td>
                  <td className={tableStyles.actions}>
                    <DestinationActions
                      slug={details.slug}
                      destinationId={d.id}
                      name={d.name}
                      url={d.url}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
