import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Redirection Service",
  description: "High-performance URL redirection + single-admin management UI."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
