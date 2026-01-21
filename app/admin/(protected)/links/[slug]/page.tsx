import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import styles from "./slug.module.css";
import tableStyles from "../links.module.css";
import CopyButton from "../CopyButton";
import { getKv } from "@/lib/storage";
import { addDestination, setDestinationEnabled, setSlugEnabled, resetSlugClickCount } from "./serverActions";
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
  return d.toLocaleString();
}

export default async function SlugDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const { slug } = await params;
  const { error, updated } = await searchParams;
  const kv = getKv();
  const details = await kv.getSlugDetails(slug);
  if (!details) redirect(`/admin/links?error=${encodeURIComponent("Slug not found.")}`);

  const baseUrl = await getPublicBaseUrl();
  const shortUrl = baseUrl ? `${baseUrl}/${details.slug}` : `/${details.slug}`;

  return (
    <div className={styles.grid}>
      <section className={tableStyles.panel}>
        <header className={tableStyles.panelHeader}>
          <h1 className={tableStyles.title}>
            <code className={tableStyles.code}>/{details.slug}</code>
          </h1>
          <p className={tableStyles.sub}>
            Round-robin redirect across enabled destinations. Disable the slug (or all destinations) to send traffic to{" "}
            <code className={tableStyles.code}>/fallback</code>.
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
            <div className={styles.metaLabel}>Redirection link</div>
            <div className={styles.metaValue}>
              <a className={tableStyles.destLink} href={shortUrl} target="_blank" rel="noreferrer">
                {shortUrl}
              </a>
              <CopyButton text={shortUrl} />
            </div>
          </div>
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>Created</div>
            <div className={styles.metaValue}>{fmtDate(details.createdAt)}</div>
          </div>
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>Total clicks</div>
            <div className={styles.metaValue}>{details.totalClickCount}</div>
          </div>
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>Round-robin cursor</div>
            <div className={styles.metaValue}>{details.roundRobinCursor}</div>
          </div>
          <div className={styles.metaActions}>
            <form action={setSlugEnabled} className={tableStyles.inlineForm}>
              <input type="hidden" name="slug" value={details.slug} />
              <input type="hidden" name="enabled" value={details.enabled ? "0" : "1"} />
              <button
                className={`${tableStyles.toggle} ${details.enabled ? tableStyles.toggleOn : tableStyles.toggleOff}`}
                type="submit"
              >
                {details.enabled ? "Enabled" : "Disabled"}
              </button>
            </form>
            <form action={resetSlugClickCount}>
              <input type="hidden" name="slug" value={details.slug} />
              <button className={`${tableStyles.actionBtn} ${tableStyles.reset}`} type="submit">
                Reset slug clicks
              </button>
            </form>
            <Link className={tableStyles.actionBtn} href="/admin/links">
              Back to list
            </Link>
          </div>
        </div>

        <div className={tableStyles.tableWrap}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Destination URL</th>
                <th>Status</th>
                <th>Created</th>
                <th>Clicks</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {details.destinations.map((d) => (
                <tr key={d.id}>
                  <td className={tableStyles.dest}>
                    <a className={tableStyles.destLink} href={d.url} target="_blank" rel="noreferrer">
                      {d.url}
                    </a>
                    <div className={styles.destId}>id: {d.id}</div>
                  </td>
                  <td>
                    <form action={setDestinationEnabled} className={tableStyles.inlineForm}>
                      <input type="hidden" name="slug" value={details.slug} />
                      <input type="hidden" name="destinationId" value={d.id} />
                      <input type="hidden" name="enabled" value={d.enabled ? "0" : "1"} />
                      <button
                        className={`${tableStyles.toggle} ${d.enabled ? tableStyles.toggleOn : tableStyles.toggleOff}`}
                        type="submit"
                      >
                        {d.enabled ? "Enabled" : "Disabled"}
                      </button>
                    </form>
                  </td>
                  <td className={tableStyles.mono}>{fmtDate(d.createdAt)}</td>
                  <td className={tableStyles.mono}>{d.clickCount}</td>
                  <td className={tableStyles.actions}>
                    <DestinationActions slug={details.slug} destinationId={d.id} url={d.url} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className={tableStyles.panel}>
        <header className={tableStyles.panelHeader}>
          <h2 className={tableStyles.title} style={{ fontSize: 22 }}>
            Add Destination
          </h2>
          <p className={tableStyles.sub}>New destinations join the round-robin immediately if enabled.</p>
        </header>

        <form className={tableStyles.form} action={addDestination}>
          <input type="hidden" name="slug" value={details.slug} />
          <label className={tableStyles.label}>
            <span className={tableStyles.labelText}>Destination URL</span>
            <input className={tableStyles.input} name="url" placeholder="https://example.com/landing" required />
          </label>
          <button className={tableStyles.create} type="submit">
            Add Destination
          </button>
        </form>

        <div className={tableStyles.note}>
          <div className={tableStyles.noteTitle}>Fallback</div>
          <p className={tableStyles.noteText}>
            If the slug is disabled (or all destinations are disabled), traffic is redirected to{" "}
            <code className={tableStyles.code}>/fallback</code>. Customize it in{" "}
            <Link className={tableStyles.destLink} href="/admin/fallback">
              admin fallback editor
            </Link>
            .
          </p>
        </div>
      </aside>
    </div>
  );
}
