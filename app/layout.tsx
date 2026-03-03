import type { Metadata } from "next";
import { LocaleProvider } from "@/components/LocaleProvider";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "PlushVote - Plush Idea Community",
  description: "Discover, share, and vote for the next lovable plush toy designs."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <LocaleProvider>
          <SiteHeader />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
