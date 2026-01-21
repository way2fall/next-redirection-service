import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "重定向服务",
  description: "高性能 URL 重定向 + 单管理员管理界面。"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
