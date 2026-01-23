import FallbackClient from "./FallbackClient";

export const runtime = "nodejs";

export default async function AdminFallbackPage() {
  return <FallbackClient />;
}
