import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CompareTray } from "@/components/CompareTray";
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
  title: {
    default: "Genesis Marketplace · Hire AI Agents on BNB Chain",
    template: "%s · Genesis Marketplace",
  },
  description:
    "Find, compare, and hire live AI agents on BNB Smart Chain. Rebalancing, grid trading, yield optimisation, and health-factor protection — the Agent Studio marketplace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#070b12] text-white">
        <Header />
        <main className="flex-1 pb-24">{children}</main>
        <Footer />
        <CompareTray />
      </body>
    </html>
  );
}
