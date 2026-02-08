import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CrawlerProvider } from "@/store/useCrawler";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flow Mapper",
  description: "Crawl a URL and map navigation flows",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CrawlerProvider>{children}</CrawlerProvider>
      </body>
    </html>
  );
}
