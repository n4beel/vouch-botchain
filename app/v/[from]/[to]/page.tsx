"use client";

import { use } from "react";
import Link from "next/link";
import { isAddress, getAddress, type Address } from "viem";
import { useReadContract } from "wagmi";
import { vouchAbi } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment, isDeployed } from "@/lib/botchain/deployment";
import Panel from "@/components/ui/Panel";
import LimitsBanner from "@/components/vouch/LimitsBanner";
import { decodeLabel, formatShortAddress, formatSinceDate } from "@/lib/vouch";

interface VouchReceiptPageProps {
  params: Promise<{ from: string; to: string }>;
}

export default function VouchReceiptPage({ params }: VouchReceiptPageProps) {
  const resolved = use(params);
  const rawFrom = resolved?.from || "";
  const rawTo = resolved?.to || "";

  const isFromValid = isAddress(rawFrom);
  const isToValid = isAddress(rawTo);

  const fromAddr: Address | undefined = isFromValid ? getAddress(rawFrom) : undefined;
  const toAddr: Address | undefined = isToValid ? getAddress(rawTo) : undefined;

  const deployment = getDeployment(activeBotChain.id);
  const deployed = isDeployed(activeBotChain.id);

  // Check if vouch is currently active
  const { data: isVouchedData, isLoading: isChecking } = useReadContract({
    address: deployment.address,
    abi: vouchAbi,
    functionName: "isVouched",
    args: fromAddr && toAddr ? [fromAddr, toAddr] : undefined,
    query: {
      enabled: Boolean(fromAddr && toAddr && deployed),
    },
  });

  // Read outgoing edges from endorser to extract label and since
  const { data: outgoingData, isLoading: isLoadingOutgoing } = useReadContract({
    address: deployment.address,
    abi: vouchAbi,
    functionName: "outgoing",
    args: fromAddr ? [fromAddr] : undefined,
    query: {
      enabled: Boolean(fromAddr && isVouchedData && deployed),
    },
  });

  if (!isFromValid || !isToValid || !fromAddr || !toAddr) {
    return (
      <div className="w-full max-w-lg mx-auto py-12">
        <Panel variant="elevated" className="text-center py-10 space-y-3">
          <h1 className="text-lg font-bold text-[var(--danger)] font-mono">
            Invalid Vouch Link
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            One or both addresses in this link are malformed.
          </p>
          <div className="pt-2">
            <Link href="/" className="text-xs text-[var(--accent)] underline font-mono">
              Return to Constellation
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  const isLoading = isChecking || isLoadingOutgoing;
  const isActive = Boolean(isVouchedData);

  // Extract label and timestamp
  let foundLabel = "";
  let foundSince = 0n;
  if (outgoingData) {
    const [tos, labels, sinces] = outgoingData;
    const idx = tos.findIndex((a) => a.toLowerCase() === toAddr.toLowerCase());
    if (idx !== -1) {
      foundLabel = decodeLabel(labels[idx]);
      foundSince = sinces[idx];
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 py-6">
      <Panel variant="surface" className="p-6 sm:p-8 space-y-6">
        <header className="border-b border-[var(--border-subtle)] pb-4 flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--accent)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            Verified BOT Chain Vouch
          </span>
          <span
            className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold ${
              isActive
                ? "bg-[rgba(139,224,176,0.15)] text-[#8BE0B0]"
                : "bg-[rgba(255,179,199,0.15)] text-[var(--danger)]"
            }`}
          >
            {isLoading ? "Checking…" : isActive ? "Active Endorsement" : "Revoked / Inactive"}
          </span>
        </header>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)] font-mono">
            Verifying on-chain endorsement…
          </div>
        ) : isActive ? (
          <div className="space-y-6">
            {/* Endorsement Visual Flow */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)]">
              {/* Endorser */}
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[11px] text-[var(--text-muted)] font-mono uppercase tracking-wider block">
                  Endorser
                </span>
                <Link
                  href={`/a/${fromAddr}`}
                  className="font-mono text-sm font-bold text-[var(--accent)] hover:underline block"
                >
                  {formatShortAddress(fromAddr)}
                </Link>
                <span className="text-[10px] text-[var(--text-tertiary)] font-mono block">
                  {fromAddr}
                </span>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center gap-1 text-[var(--accent)]">
                <span className="text-xs font-mono">vouches for</span>
                <svg className="w-6 h-6 transform sm:rotate-0 rotate-90" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                </svg>
              </div>

              {/* Recipient */}
              <div className="space-y-1 text-center sm:text-right">
                <span className="text-[11px] text-[var(--text-muted)] font-mono uppercase tracking-wider block">
                  Endorsed Wallet
                </span>
                <Link
                  href={`/a/${toAddr}`}
                  className="font-mono text-sm font-bold text-[#8BE0B0] hover:underline block"
                >
                  {formatShortAddress(toAddr)}
                </Link>
                <span className="text-[10px] text-[var(--text-tertiary)] font-mono block">
                  {toAddr}
                </span>
              </div>
            </div>

            {/* Endorsement Label & Timestamp */}
            <div className="space-y-3 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)] font-mono">Endorsement Context:</span>
                <span className="font-semibold text-sm text-[var(--text-primary)]">
                  "{foundLabel || "None specified"}"
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)] font-mono">Active Since:</span>
                <span className="font-mono text-[var(--text-secondary)]">
                  {foundSince > 0n ? formatSinceDate(foundSince) : "unknown"}
                </span>
              </div>
              <div className="pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)] italic">
                Note: This vouch is an opinion published on BOT Chain. The endorser can withdraw or revoke it at any time.
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs font-mono">
              <Link href={`/a/${fromAddr}`} className="text-[var(--accent)] hover:underline">
                ← Explore {formatShortAddress(fromAddr)}'s Constellation
              </Link>
              <Link href={`/a/${toAddr}`} className="text-[var(--accent)] hover:underline">
                Explore {formatShortAddress(toAddr)}'s Constellation →
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm text-[var(--text-secondary)] font-mono">
              No active vouch exists from {formatShortAddress(fromAddr)} to {formatShortAddress(toAddr)}.
            </p>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              This endorsement may have been withdrawn or was never created.
            </p>
            <div className="pt-2">
              <Link href="/" className="text-xs text-[var(--accent)] underline font-mono">
                Return to Home Constellation
              </Link>
            </div>
          </div>
        )}
      </Panel>

      <LimitsBanner />
    </div>
  );
}
