import type { Metadata } from "next";
import { Chivo_Mono, Spectral } from "next/font/google";
import "./globals.css";

const mono = Chivo_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["300", "400", "600"]
});

const serif = Spectral({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "600", "700"]
});

export const metadata: Metadata = {
  title: "Redirection Service",
  description: "High-performance URL redirection + single-admin management UI."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}

