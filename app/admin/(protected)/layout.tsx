import styles from "./admin.module.css";
import { requireAdmin } from "@/lib/auth/session";
import Link from "next/link";
import { logout } from "./serverActions";

export const runtime = "nodejs";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true" />
          <div>
            <div className={styles.brandTitle}>Registry Console</div>
            <div className={styles.brandSub}>single-admin • kv-backed</div>
          </div>
        </div>
        <nav className={styles.nav}>
          <Link className={styles.navLink} href="/admin/links">
            Links
          </Link>
          <Link className={styles.navLink} href="/admin/fallback">
            Fallback
          </Link>
          <form action={logout}>
            <button className={styles.navButton} type="submit">
              Logout
            </button>
          </form>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
