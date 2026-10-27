import type { Metadata } from "next";
import { Sora, Inconsolata } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${soraFont.variable} ${inconsolataFont.variable}`}>
      <body className="antialiased min-h-[100dvh] flex flex-col bg-[#0A0F2C]">
        <Providers>
          <PageShell>{children}</PageShell>
        </Providers>
      </body>
    </html>
  );
}
