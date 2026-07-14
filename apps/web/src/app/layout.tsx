import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"),
  title: "Graded",
  description: "A public sports-pick accountability tracker.",
  openGraph: {
    title: "Graded — the sports-pick accountability tracker",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
