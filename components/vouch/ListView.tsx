"use client";

import Link from "next/link";
import type { Address } from "viem";
import { type Edge, type IngoingEdge, formatShortAddress, formatSinceDate } from "@/lib/vouch";

interface ListViewProps {
  centerAddress: Address;
  outgoing: Edge[];
  incoming: IngoingEdge[];
  onUnvouch?: (to: Address) => void;
  canUnvouch?: boolean;
}

export default function ListView({
  centerAddress,
  outgoing,
  incoming,
  onUnvouch,
  canUnvouch = false,
}: ListViewProps) {
  return (
    <div className="w-full space-y-6">
      {/* Outgoing Endorsements Section */}
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-4">
          <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-[var(--accent)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            Outgoing Endorsements ({outgoing.length} / 10)
          </h2>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            Vouched by this wallet
          </span>
        </div>

        {outgoing.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic py-2">
            This address has not vouched for anyone yet.
          </p>
        ) : (
          <dl className="divide-y divide-[var(--border-subtle)]">
            {outgoing.map((edge) => (
              <div
                key={edge.to}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <dt className="text-xs font-mono font-semibold">
                    <Link
                      href={`/a/${edge.to}`}
                      className="text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors underline"
                    >
                      {formatShortAddress(edge.to)}
                    </Link>
                  </dt>
                  <dd className="text-xs text-[var(--text-secondary)]">
                    Label: <span className="text-[var(--text-primary)] font-medium">"{edge.label}"</span>
                    {edge.since > 0n && (
                      <span className="text-[var(--text-muted)] text-[11px] ml-2">
                        · since {formatSinceDate(edge.since)}
                      </span>
                    )}
                  </dd>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/v/${centerAddress}/${edge.to}`}
                    className="text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--accent)] underline"
                  >
                    View Vouch →
                  </Link>

                  {canUnvouch && onUnvouch && (
                    <button
                      onClick={() => onUnvouch(edge.to)}
                      className="text-xs font-mono font-semibold text-[var(--danger)] hover:underline cursor-pointer"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Incoming Endorsements Section */}
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-4">
          <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-[#8BE0B0] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8BE0B0]" />
            Incoming Vouches ({incoming.length})
          </h2>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            Vouched by others
          </span>
        </div>

        {incoming.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic py-2">
            No one has vouched for this address yet.
          </p>
        ) : (
          <dl className="divide-y divide-[var(--border-subtle)]">
            {incoming.map((edge) => (
              <div
                key={edge.from}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <dt className="text-xs font-mono font-semibold">
                    <Link
                      href={`/a/${edge.from}`}
                      className="text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors underline"
                    >
                      {formatShortAddress(edge.from)}
                    </Link>
                  </dt>
                  <dd className="text-xs text-[var(--text-secondary)]">
                    Label: <span className="text-[var(--text-primary)] font-medium">"{edge.label}"</span>
                  </dd>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/v/${edge.from}/${centerAddress}`}
                    className="text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--accent)] underline"
                  >
                    View Vouch →
                  </Link>
                </div>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  );
}
