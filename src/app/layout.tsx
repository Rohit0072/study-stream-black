import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { DebugMenu } from "@/components/debug/debug-menu";

import { ShortcutsModal } from "@/components/layout/shortcuts-modal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Study Stream",
  description: "Offline-first educational video player",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://js.puter.com/v2/"></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >

        <ShortcutsModal />
        {children}
        <DebugMenu />
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
