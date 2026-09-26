import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { HeaderConnectButton } from "@/components/header-connect-button";
import ChainGuard, { NavLink } from "@/components/ChainGuard";

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
          <header className="border-b border-black/[.08] px-3 py-3 sm:px-6 sm:py-4 dark:border-white/[.145]">
            {/*
              Two explicit rows, not one big flex-wrap: at 375px the combined
              width of the brand link, nav links, network pill and connect
              button is too wide for any single row, and letting them wrap
              naturally spills across 3-4 lines. Utility row (network pill +
              wallet status) on top, primary nav (brand + links) below — each
              row's own content fits one line down to 375px.
            */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-800 sm:px-2.5 sm:py-1 sm:text-[10px] sm:uppercase sm:tracking-wide dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
                Test network · no real money
              </span>
              <HeaderConnectButton />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 sm:mt-2 sm:gap-x-6">
              <Link href="/" className="inline-flex min-h-11 items-center text-base font-semibold">
                Seikyu
              </Link>
              <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium sm:gap-x-6 sm:text-sm">
                <NavLink href="/issue">For suppliers</NavLink>
                <NavLink href="/#for-sale">For investors</NavLink>
                <NavLink href="/accountant">For debtors</NavLink>
              </nav>
            </div>
          </header>
          <ChainGuard />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
