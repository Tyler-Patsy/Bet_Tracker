import type { Metadata } from "next";
import { Geist, Geist_Mono, Barlow_Condensed } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"),
  title: {
    default: "Graded — the public record for sports picks",
    template: "%s — Graded",
  },
  description:
    "Every publicly posted pick, graded against the final score and kept on the record — including the ones cappers delete.",
  openGraph: {
    title: "Graded — the public record for sports picks",
    description: "Every pick tracked. Every deletion counted.",
    images: ["/api/og/leaderboard?window=30d"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
