import { login } from "./serverActions";
import styles from "./login.module.css";
import { isAdminAuthed } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdminAuthed()) redirect("/admin/links");

  const { error } = await searchParams;
  const errorText =
    error === "invalid"
      ? "Invalid username or password."
      : error === "misconfigured"
        ? "Admin auth is not configured on this deployment. Set ADMIN_USERNAME, ADMIN_PASSWORD_HASH, and SESSION_SECRET."
        : error
          ? "Login failed."
          : null;

  return (
    <main className={styles.shell}>
      <div className={styles.backplate} aria-hidden="true" />
      <section className={styles.panel}>
        <header className={styles.header}>
          <p className={styles.kicker}>Admin Access</p>
          <h1 className={styles.title}>Link Registry</h1>
          <p className={styles.sub}>
            Single-user instance. Sessions are server-only; credentials live in env vars.
          </p>
        </header>

        {errorText ? (
          <div className={styles.alert} role="alert">
            <span className={styles.alertMark}>!</span>
            <span>{errorText}</span>
          </div>
        ) : null}

        <form className={styles.form} action={login}>
          <label className={styles.label}>
            <span className={styles.labelText}>Username</span>
            <input
              name="username"
              autoComplete="username"
              className={styles.input}
              placeholder="admin"
              required
            />
          </label>

          <label className={styles.label}>
            <span className={styles.labelText}>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className={styles.input}
              placeholder="••••••••••••"
              required
            />
          </label>

          <button className={styles.button} type="submit">
            Enter Console
            <span className={styles.buttonArrow} aria-hidden="true">
              →
            </span>
          </button>
        </form>

        <footer className={styles.footer}>
          <span className={styles.footerHint}>Tip:</span> Use a strong session secret and a bcrypt
          hash for the admin password.
        </footer>
      </section>
    </main>
  );
}
