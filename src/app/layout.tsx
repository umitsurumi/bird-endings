import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "鸟类转生测试 | bird-ending",
  description: "完成 12 道题，看看你会转生成哪一种鸟。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
