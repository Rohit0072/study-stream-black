import type { Metadata } from "next";
// Removed Google Fonts imports to fix build error
import "./globals.css";
import { ClientErrorBoundary } from "@/components/layout/client-error-boundary";
import { GlobalUIProvider } from "@/components/layout/global-ui-provider";

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
        className="antialiased font-sans"
        style={{
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}
      >
        <ClientErrorBoundary>
          <GlobalUIProvider />
          {children}
        </ClientErrorBoundary>
      </body>
    </html>
  );
}



