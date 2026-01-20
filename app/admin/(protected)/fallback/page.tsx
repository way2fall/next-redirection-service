import styles from "./fallback.module.css";
import { getKv } from "@/lib/storage";
import { saveFallback, resetFallback } from "./serverActions";

export const runtime = "nodejs";

export default async function AdminFallbackPage() {
  const kv = getKv();
  const current = (await kv.getFallbackHtml()) ?? "";

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Fallback Page</h1>
          <p className={styles.sub}>
            Served publicly at <code className={styles.code}>/fallback</code>. Store raw HTML/CSS/JS.
          </p>
        </div>
        <div className={styles.headerActions}>
          <a className={styles.preview} href="/fallback" target="_blank" rel="noreferrer">
            Preview
          </a>
          <form action={resetFallback}>
            <button className={styles.reset} type="submit">
              Reset to default
            </button>
          </form>
        </div>
      </header>

      <form className={styles.form} action={saveFallback}>
        <textarea
          className={styles.textarea}
          name="html"
          spellCheck={false}
          placeholder="Paste full HTML here (<!doctype html> ...). Leave empty to use the built-in default."
          defaultValue={current}
        />
        <div className={styles.footer}>
          <div className={styles.warn}>
            This HTML is served to the public. Only paste code you trust.
          </div>
          <button className={styles.save} type="submit">
            Save
          </button>
        </div>
      </form>
    </section>
  );
}

