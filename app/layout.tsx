import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PlushVote - 毛绒玩具创意投票平台",
  description: "发现、分享、投票支持你最想养的毛绒玩具创意。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
