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
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[.08] px-4 py-3 sm:px-6 sm:py-4 dark:border-white/[.145]">
            <div className="flex flex-wrap items-center gap-3 sm:gap-5">
              <nav className="flex flex-wrap items-center gap-4 text-sm font-medium sm:gap-6">
                <Link href="/" className="inline-flex min-h-10 items-center">
                  Home
                </Link>
                <Link href="/issue" className="inline-flex min-h-10 items-center">
                  Issue
                </Link>
                <Link href="/accountant" className="inline-flex min-h-10 items-center">
                  Accountant
                </Link>
              </nav>
              <span className="whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
                Sepolia testnet · demo
              </span>
            </div>
            <HeaderConnectButton />
          </header>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
