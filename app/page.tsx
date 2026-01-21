export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontFamily: "var(--font-serif)", letterSpacing: "-0.02em" }}>
        重定向服务
      </h1>
      <p style={{ maxWidth: 720, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
        此实例在 <code>/{`{slug}`}</code> 提供公开重定向，并在 <code>/admin</code> 提供仅管理员可用的管理界面。
      </p>
    </main>
  );
}
