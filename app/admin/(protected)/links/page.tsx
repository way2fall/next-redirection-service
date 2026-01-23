import LinksClient from "./LinksClient";

export const runtime = "nodejs";

export default async function AdminLinksPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    deleted?: string;
    updated?: string;
    reset?: string;
    error?: string;
  }>;
}) {
  const { created, deleted, updated, reset, error } = await searchParams;

  const initialBanner = error
    ? ({ tone: "danger", mark: "!", text: error } as const)
    : created
      ? ({ tone: "ok", mark: "+", text: `已创建 /${created}` } as const)
      : deleted
        ? ({ tone: "ok", mark: "−", text: `已删除 /${deleted}` } as const)
        : updated
          ? ({ tone: "ok", mark: "↻", text: `已更新 /${updated}` } as const)
          : reset
            ? ({ tone: "ok", mark: "0", text: `已重置 /${reset} 的点击数` } as const)
            : null;

  return <LinksClient initialBanner={initialBanner} />;
}
