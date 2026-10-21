import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reward Jar — Your Loyalty Deserves More",
  description:
    "Reward Jar is India-first loyalty and rewards. Discover local businesses, earn rewards on every visit, and get more from the places you love. Shop local. Earn rewards. Come back.",
  keywords: [
    "Reward Jar",
    "loyalty rewards India",
    "local business loyalty",
    "stamp card app",
    "Noida rewards",
  ],
  authors: [{ name: "Reward Jar" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Reward Jar — Your Loyalty Deserves More",
    description:
      "Discover local businesses, earn rewards on every visit, and get more from the places you love.",
    siteName: "Reward Jar",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#163300",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Failure-safe motion gate (docs/DESIGN.md §7): reveal-hidden states only
            apply under .js, set before first paint. No-JS = content always visible. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add("js");`,
          }}
        />
      </head>
      <body
        className={`${manrope.variable} ${bricolage.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground grain`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
