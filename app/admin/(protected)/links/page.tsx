import styles from "./links.module.css";
import { getKv } from "@/lib/storage";
import { createLink, deleteLink } from "./serverActions";

export const runtime = "nodejs";

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default async function AdminLinksPage({
  searchParams
}: {
  searchParams: Promise<{ created?: string; deleted?: string; error?: string }>;
}) {
  const kv = getKv();
  const links = await kv.listLinks();
  const { created, deleted, error } = await searchParams;

  return (
    <div className={styles.grid}>
      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <h1 className={styles.title}>Links</h1>
          <p className={styles.sub}>
            Create, list, and delete redirects. Public hits resolve via Edge 302.
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
        ) : null}

        <div className={styles.tableWrap}>
          {links.length === 0 ? (
            <div className={styles.empty}>No links yet. Create your first redirect on the right.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Slug</th>
                  <th>Destination</th>
                  <th>Created</th>
                  <th>Clicks</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {links.map((l) => (
                  <tr key={l.slug}>
                    <td>
                      <code className={styles.code}>/{l.slug}</code>
                    </td>
                    <td className={styles.dest}>
                      <a className={styles.destLink} href={l.destination} target="_blank" rel="noreferrer">
                        {l.destination}
                      </a>
                    </td>
                    <td className={styles.mono}>{fmtDate(l.createdAt)}</td>
                    <td className={styles.mono}>{l.clickCount ?? 0}</td>
                    <td className={styles.actions}>
                      <form action={deleteLink}>
                        <input type="hidden" name="slug" value={l.slug} />
                        <button className={styles.delete} type="submit">
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <aside className={styles.panel}>
        <header className={styles.panelHeader}>
          <h2 className={styles.title} style={{ fontSize: 22 }}>
            Create Redirect
          </h2>
          <p className={styles.sub}>Slugs are lowercased. Only letters, digits, “-”, “_”.</p>
        </header>

        <form className={styles.form} action={createLink}>
          <label className={styles.label}>
            <span className={styles.labelText}>Slug</span>
            <input className={styles.input} name="slug" placeholder="docs" required />
          </label>
          <label className={styles.label}>
            <span className={styles.labelText}>Destination URL</span>
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
            Redirects resolve in <span className={styles.pill}>Edge</span> with a single KV lookup.
            Admin actions run in <span className={styles.pill}>Node.js</span> and do not affect the
            redirect critical path.
          </p>
        </div>
      </aside>
    </div>
  );
}

