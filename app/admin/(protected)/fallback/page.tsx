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
          <h1 className={styles.title}>斗篷页</h1>
          <p className={styles.sub}>
            对外公开访问路径为 <code className={styles.code}>/fallback</code>
            。可保存原始 HTML/CSS/JS。
          </p>
        </div>
        <div className={styles.headerActions}>
          <a
            className={styles.preview}
            href="/fallback"
            target="_blank"
            rel="noreferrer"
          >
            预览
          </a>
          <form action={resetFallback}>
            <button className={styles.reset} type="submit">
              恢复默认
            </button>
          </form>
        </div>
      </header>

      <form className={styles.form} action={saveFallback}>
        <textarea
          className={styles.textarea}
          name="html"
          spellCheck={false}
          placeholder="在此粘贴完整 HTML（<!doctype html> ...）。留空则使用内置默认页面。"
          defaultValue={current}
        />
        <div className={styles.footer}>
          <div className={styles.warn}>
            此 HTML 会公开对外提供。只粘贴你信任的代码。
          </div>
          <button className={styles.save} type="submit">
            保存
          </button>
        </div>
      </form>
    </section>
  );
}
