import styles from "./links.module.css";
import { getKv } from "@/lib/storage";
import { createSlug, deleteSlug, resetSlugClickCount, setSlugEnabled } from "./serverActions";
import { headers } from "next/headers";
import Link from "next/link";
import CopyButton from "./CopyButton";

export const runtime = "nodejs";

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
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
  searchParams
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
      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <h1 className={styles.title}>Slugs</h1>
          <p className={styles.sub}>
            Each slug can have multiple destinations with round-robin routing (Edge 302).
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
              Created <code className={styles.code}>/{created}</code>
            </span>
          </div>
        ) : deleted ? (
          <div className={styles.banner} data-tone="ok">
            <span className={styles.bannerMark}>−</span>
            <span>
              Deleted <code className={styles.code}>/{deleted}</code>
            </span>
          </div>
        ) : updated ? (
          <div className={styles.banner} data-tone="ok">
            <span className={styles.bannerMark}>↻</span>
            <span>
              Updated <code className={styles.code}>/{updated}</code>
            </span>
          </div>
        ) : reset ? (
          <div className={styles.banner} data-tone="ok">
            <span className={styles.bannerMark}>0</span>
            <span>
              Reset clicks for <code className={styles.code}>/{reset}</code>
            </span>
          </div>
        ) : null}

        <div className={styles.tableWrap}>
          {slugs.length === 0 ? (
            <div className={styles.empty}>No slugs yet. Create your first short link on the right.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Slug</th>
                  <th>Redirection Link</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Clicks</th>
                  <th>Destinations</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slugs.map((s) => {
                  const shortUrl = baseUrl ? `${baseUrl}/${s.slug}` : `/${s.slug}`;
                  return (
                    <tr key={s.slug}>
                    <td>
                      <code className={styles.code}>/{s.slug}</code>
                    </td>
                    <td className={styles.dest}>
                      <div className={styles.linkCell}>
                        <a className={styles.destLink} href={shortUrl} target="_blank" rel="noreferrer">
                          {shortUrl}
                        </a>
                        <CopyButton text={shortUrl} />
                      </div>
                    </td>
                    <td>
                      <form action={setSlugEnabled} className={styles.inlineForm}>
                        <input type="hidden" name="slug" value={s.slug} />
                        <input type="hidden" name="enabled" value={s.enabled ? "0" : "1"} />
                        <button
                          className={`${styles.toggle} ${s.enabled ? styles.toggleOn : styles.toggleOff}`}
                          type="submit"
                        >
                          {s.enabled ? "Enabled" : "Disabled"}
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
                        <Link className={styles.actionBtn} href={`/admin/links/${encodeURIComponent(s.slug)}`}>
                          Manage
                        </Link>
                        <form action={resetSlugClickCount}>
                          <input type="hidden" name="slug" value={s.slug} />
                          <button className={`${styles.actionBtn} ${styles.reset}`} type="submit">
                            Reset
                          </button>
                        </form>
                        <form action={deleteSlug}>
                          <input type="hidden" name="slug" value={s.slug} />
                          <button className={`${styles.actionBtn} ${styles.delete}`} type="submit">
                            Delete
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

      <aside className={styles.panel}>
        <header className={styles.panelHeader}>
          <h2 className={styles.title} style={{ fontSize: 22 }}>
            Create Slug
          </h2>
          <p className={styles.sub}>Slugs are lowercased. Only letters, digits, “-”, “_”.</p>
        </header>

        <form className={styles.form} action={createSlug}>
          <label className={styles.label}>
            <span className={styles.labelText}>Slug</span>
            <input className={styles.input} name="slug" placeholder="docs" required />
          </label>
          <label className={styles.label}>
            <span className={styles.labelText}>First Destination URL</span>
            <input
              className={styles.input}
              name="destination"
              placeholder="https://example.com/somewhere"
              required
            />
          </label>
          <button className={styles.create} type="submit">
            Create Link
          </button>
        </form>

        <div className={styles.note}>
          <div className={styles.noteTitle}>Performance boundary</div>
          <p className={styles.noteText}>
            Redirects resolve in <span className={styles.pill}>Edge</span> with 1 KV read + 1 KV
            counter increment (round-robin). Analytics counters are fire-and-forget.
          </p>
        </div>
      </aside>
    </div>
  );
}
