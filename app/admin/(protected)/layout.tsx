import styles from "./admin.module.css";
import { requireAdmin } from "@/lib/auth/session";
import Link from "next/link";
import { logout } from "./serverActions";

export const runtime = "nodejs";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true" />
          <div>
            <div className={styles.brandTitle}>大富豪分流器</div>
            <div className={styles.brandSub}>单管理员 • KV 存储</div>
          </div>
        </div>
        <nav className={styles.nav}>
          <Link className={styles.navLink} href="/admin/links">
            链接
          </Link>
          <Link className={styles.navLink} href="/admin/fallback">
            斗篷页
          </Link>
          <form action={logout}>
            <button className={styles.navButton} type="submit">
              退出登录
            </button>
          </form>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
