export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontFamily: "var(--font-serif)", letterSpacing: "-0.02em" }}>
        Redirection Service
      </h1>
      <p style={{ maxWidth: 720, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
        This instance serves public redirects at <code>/{`{slug}`}</code> and an admin-only
        management UI at <code>/admin</code>.
      </p>
    </main>
  );
}

