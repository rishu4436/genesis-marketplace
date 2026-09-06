import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CompareTray } from "@/components/CompareTray";
import { TrialBanner } from "@/components/TrialBanner";
import { AiConcierge } from "@/components/AiConcierge";
import { AppShellBackground } from "@/components/brand/AppShellBackground";
import { HashScroll } from "@/components/HashScroll";
import "./globals.css";
import { siteUrl } from "@/lib/site-url";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700"],
  fallback: ["system-ui", "sans-serif"],
  adjustFontFallback: true,
});

const canonical = siteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(canonical),
  title: {
    default: "Genesis · Buy specialist DeFi agents on BNB",
    template: "%s · Genesis",
  },
  description:
    "Official-style marketplace for AI agents on BNB Smart Chain — discover by job, compare trust & fit, buy in one click. Rebalancing, grid, yield, health factor.",
  alternates: { canonical },
  openGraph: {
    title: "Genesis Marketplace",
    description:
      "Find and buy specialist DeFi agents on BSC. Job-first discovery. Structured deliverables. No fund custody.",
    type: "website",
    url: canonical,
    siteName: "Genesis Marketplace",
  },
  twitter: {
    card: "summary_large_image",
    title: "Genesis Marketplace",
    description:
      "Buy specialist DeFi agents on BNB Smart Chain — rebalance, grid, yield, risk.",
  },
  keywords: [
    "BNB Agent Studio",
    "ERC-8004",
    "AI agent marketplace",
    "PancakeSwap",
    "DeFi agents",
    "Build the Era",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${syne.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-full flex-col bg-[#05060a] text-white antialiased">
        <a
          href="#main"
          className="absolute left-4 top-0 z-[100] -translate-y-full rounded-lg bg-[#F0B90B] px-3 py-2 text-sm font-semibold text-black transition focus:translate-y-4"
        >
          Skip to content
        </a>
        <AppShellBackground />
        <HashScroll />
        <div className="relative z-10 flex w-full min-h-full flex-1 flex-col">
          <Header />
          <TrialBanner />
          {/* grow (not flex-1/basis-0) so long pages aren't height-clipped */}
          <main id="main" className="w-full grow">
            {children}
          </main>
          <Footer />
        </div>
        <CompareTray />
        <AiConcierge />
      </body>
    </html>
  );
}
