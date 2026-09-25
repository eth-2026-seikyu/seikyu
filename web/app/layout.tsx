import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { HeaderConnectButton } from "@/components/header-connect-button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Seikyu — Invoice RWA",
  description: "Tokenized invoice receivables marketplace",
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
        <Providers>
          <header className="flex items-center justify-between border-b border-black/[.08] px-6 py-4 dark:border-white/[.145]">
            <nav className="flex items-center gap-6 text-sm font-medium">
              <Link href="/">Home</Link>
              <Link href="/issue">Issue</Link>
              <Link href="/accountant">Accountant</Link>
            </nav>
            <HeaderConnectButton />
          </header>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
