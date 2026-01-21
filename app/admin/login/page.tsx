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
      ? "用户名或密码不正确。"
      : error === "misconfigured"
        ? "此部署未配置管理员认证。请设置 ADMIN_USERNAME、ADMIN_PASSWORD_HASH 和 SESSION_SECRET。"
        : error
          ? "登录失败。"
          : null;

  return (
    <main className={styles.shell}>
      <div className={styles.backplate} aria-hidden="true" />
      <section className={styles.panel}>
        <header className={styles.header}>
          <p className={styles.kicker}>管理员访问</p>
          <h1 className={styles.title}>链接管理</h1>
          <p className={styles.sub}>
            单用户实例。会话仅在服务器端；凭据存放在环境变量中。
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
            <span className={styles.labelText}>用户名</span>
            <input
              name="username"
              autoComplete="username"
              className={styles.input}
              placeholder="admin"
              required
            />
          </label>

          <label className={styles.label}>
            <span className={styles.labelText}>密码</span>
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
            进入控制台
            <span className={styles.buttonArrow} aria-hidden="true">
              →
            </span>
          </button>
        </form>

        <footer className={styles.footer}>
          <span className={styles.footerHint}>提示：</span>使用强随机的会话密钥，并为管理员密码使用 bcrypt 哈希。
        </footer>
      </section>
    </main>
  );
}
