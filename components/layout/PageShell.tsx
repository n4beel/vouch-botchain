"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectButton from "@/components/ui/ConnectButton";
import NetworkBadge from "@/components/botchain/NetworkBadge";
import { footerLinks } from "@/lib/botchain/chain";
import BuiltOnBotChain from "@/components/botchain/BuiltOnBotChain";
import { app } from "@/lib/app-config";

export interface NavLink {
  href: string;
  label: string;
}

interface PageShellProps {
  children: React.ReactNode;
  nav?: NavLink[];
  title?: string;
  description?: string;
}

const defaultNav: NavLink[] = [
  { href: "/", label: "Constellation" },
  { href: "/me", label: "My Vouches" },
];

export default function PageShell({
  children,
  nav = defaultNav,
  title,
  description,
}: PageShellProps) {
  const links = footerLinks();
  const pathname = usePathname();

  return (
    <div
      className="flex flex-col min-h-[100dvh] overflow-x-hidden relative selection:bg-[#FF9ECF] selection:text-[#2A0A1A]"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      {/* Subtle constellation starlight background pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 25%, rgba(255, 158, 207, 0.08) 0%, transparent 60%), radial-gradient(1px 1px at 20px 30px, #E7ECFF, rgba(0,0,0,0)), radial-gradient(1px 1px at 150px 180px, #FF9ECF, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 280px 70px, #8BE0B0, rgba(0,0,0,0)), radial-gradient(1px 1px at 420px 220px, #E7ECFF, rgba(0,0,0,0))",
          backgroundSize: "100% 100%, 350px 350px, 450px 450px, 400px 400px, 500px 500px",
        }}
        aria-hidden="true"
      />

      {/* Floating Constellation Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b"
        style={{
          backgroundColor: "rgba(10, 15, 44, 0.85)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Wordmark and star mark */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 group no-underline focus:outline-none"
            >
              <svg
                className="w-5 h-5 text-[var(--accent)] group-hover:rotate-45 transition-transform duration-300"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
              </svg>
              <span
                className="text-lg font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {app.name}
              </span>
            </Link>

            {/* Navigation links */}
            <nav className="hidden sm:flex items-center gap-1" aria-label="Constellation Navigation">
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-colors no-underline"
                    style={{
                      color: active ? "var(--accent)" : "var(--text-secondary)",
                      backgroundColor: active ? "rgba(255, 158, 207, 0.12)" : "transparent",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right utility buttons: network and wallet connect */}
          <div className="flex items-center gap-3">
            <NetworkBadge />
            <div className="w-[145px] sm:w-[170px] flex-shrink-0">
              <ConnectButton />
            </div>
          </div>
        </div>

        {/* Mobile secondary navigation strip */}
        <div className="sm:hidden flex items-center px-4 py-2 border-t border-[var(--border-subtle)] gap-2 overflow-x-auto">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap"
                style={{
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  backgroundColor: active ? "rgba(255, 158, 207, 0.12)" : "transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10 flex flex-col">
        {(title || description) && (
          <header className="mb-6">
            {title && (
              <h1
                className="text-2xl sm:text-3xl font-extrabold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {title}
              </h1>
            )}
            {description && (
              <p
                className="mt-1 text-sm leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                {description}
              </p>
            )}
          </header>
        )}
        {children}
      </main>

      {/* Observational Colophon Footer (Shared UI Contract) */}
      <footer
        className="relative z-10 border-t mt-auto py-8 px-4 sm:px-6"
        style={{
          borderColor: "var(--border-subtle)",
          backgroundColor: "rgba(10, 15, 44, 0.95)",
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="text-xs font-mono font-medium" style={{ color: "var(--text-primary)" }}>
              {app.name} · {app.tagline}
            </p>
            <p className="text-[11px] max-w-md leading-relaxed" style={{ color: "var(--text-muted)" }}>
              A public, directed graph of trust on BOT Chain. Vouches are personal endorsements, not identity verifications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono">
            <BuiltOnBotChain className="text-xs" />
            <a
              href={links.site}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--text-secondary)] hover:text-[var(--accent)] underline transition-colors"
            >
              botchain.ai
            </a>
            <a
              href={links.explorer}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--text-secondary)] hover:text-[var(--accent)] underline transition-colors"
            >
              BOT Chain Explorer
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
