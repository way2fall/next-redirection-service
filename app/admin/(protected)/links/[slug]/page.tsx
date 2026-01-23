import SlugDetailClient from "./SlugDetailClient";

export const runtime = "nodejs";

export default async function SlugDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const { slug } = await params;
  const { error, updated } = await searchParams;
  const initialBanner =
    error ? ({ tone: "danger", mark: "!", text: error } as const) : updated ? ({ tone: "ok", mark: "↻", text: updated } as const) : null;

  return <SlugDetailClient slug={slug} initialBanner={initialBanner} />;
}
