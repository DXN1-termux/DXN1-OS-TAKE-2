import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import Providers from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DXN1-OS 1.0 — Minimal LFS-based Linux Distribution",
  description:
    "DXN1-OS: a minimal Linux distribution built from source on top of LFS. Full driver support, USB / DriveDroid installable, 5 GB partition option, hybrid BIOS+UEFI bootable ISO. Download the live ISO and full source tree.",
  keywords: [
    "DXN1-OS",
    "Linux",
    "LFS",
    "Linux From Scratch",
    "operating system",
    "ISO",
    "installer",
    "minimal Linux",
  ],
  authors: [{ name: "DXN1 Project" }],
  icons: {
    icon: "/dxn1-assets/dxn1-logo.png",
    shortcut: "/dxn1-assets/dxn1-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: "#060a08", color: "#d1fae5" }}
      >
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
