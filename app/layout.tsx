import type { Metadata, Viewport } from "next";
import { Sora, Inconsolata } from "next/font/google";
import "./globals.css";
import { EvmProvider } from "@/components/providers/EvmProvider";
import { ToastProvider } from "@/components/ui/Toast";
import WrongNetworkBar from "@/components/botchain/WrongNetworkBar";
import PageShell from "@/components/layout/PageShell";
import { app } from "@/lib/app-config";

const soraFont = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const inconsolataFont = Inconsolata({
  subsets: ["latin"],
  variable: "--font-inconsolata",
  display: "swap",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: `${app.name} — ${app.tagline}`,
  description: app.description,
  openGraph: {
    title: `${app.name} — ${app.tagline}`,
    description: app.description,
    type: "website",
    url: app.url,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0F2C",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${soraFont.variable} ${inconsolataFont.variable} h-full`}
      style={{ ["--accent" as string]: app.accent }}
    >
      <body className="antialiased min-h-[100dvh] flex flex-col bg-[#0A0F2C]">
        <EvmProvider>
          <ToastProvider>
            <WrongNetworkBar />
            <PageShell>{children}</PageShell>
          </ToastProvider>
        </EvmProvider>
      </body>
    </html>
  );
}
