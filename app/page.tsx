"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { vouchAbi } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment, isDeployed } from "@/lib/botchain/deployment";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";
import StarMap from "@/components/vouch/StarMap";
import ListView from "@/components/vouch/ListView";
import VouchForm from "@/components/vouch/VouchForm";
import AddressSearch from "@/components/vouch/AddressSearch";
import LimitsBanner from "@/components/vouch/LimitsBanner";
import { useAddressVouches } from "@/components/vouch/useAddressVouches";
import { formatShortAddress } from "@/lib/vouch";

export default function Home() {
  const { address: userAddress, isConnected } = useAccount();
  const deployment = getDeployment(activeBotChain.id);
  const deployed = isDeployed(activeBotChain.id);

  const [activeTab, setActiveTab] = useState<"map" | "list">("map");
  const [showVouchForm, setShowVouchForm] = useState(false);

  // Auto-switch to list view on small screens (< 600px)
  useEffect(() => {
    const checkWidth = () => {
      if (window.innerWidth < 600) {
        setActiveTab("list");
      }
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  // Global total vouches across the entire network
  const { data: totalVouchesData, refetch: refetchTotals } = useReadContract({
    address: deployment.address,
    abi: vouchAbi,
    functionName: "totalVouches",
    query: {
      enabled: deployed,
      refetchInterval: 10_000,
    },
  });

  const {
    outgoing,
    incoming,
    incomingCount,
    logsError,
    scannedRange,
    isLoading,
    refetchAll,
  } = useAddressVouches(userAddress);

  const totalVouchesDisplay =
    totalVouchesData !== undefined ? Number(totalVouchesData).toLocaleString() : "—";

  return (
    <div className="w-full space-y-8">
      {/* Network Hero */}
      <section className="text-center space-y-4 pt-4 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] text-xs font-mono text-[var(--accent)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          <span>{totalVouchesDisplay} Active Vouches on BOT Chain</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-primary)]">
          Say who you trust. <span className="text-[var(--accent)]">In public.</span>
        </h1>

        <p className="max-w-xl mx-auto text-sm text-[var(--text-secondary)] leading-relaxed">
          A lightweight, public web of trust. Each wallet can vouch for up to 10 other wallets at a time,
          with a short context label. Free to withdraw anytime.
        </p>

        {/* Address Search Bar */}
        <div className="pt-2">
          <AddressSearch />
        </div>
      </section>

      {/* Main Interactive Stage */}
      {!deployed ? (
        <Panel variant="elevated" className="text-center py-12">
          <h2 className="text-lg font-bold text-[var(--warning)] mb-2 font-mono">
            Contract Not Live on {activeBotChain.name}
          </h2>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            The Vouch smart contract has not been deployed to this network yet. Switch networks to view live constellations.
          </p>
        </Panel>
      ) : isConnected && userAddress ? (
        <section className="space-y-6">
          {/* Header Controls for Connected Wallet */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                <h2 className="text-sm font-mono font-bold text-[var(--text-primary)]">
                  Your Constellation: {formatShortAddress(userAddress)}
                </h2>
              </div>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                {outgoing.length} outgoing /{" "}
                {logsError ? "—" : incomingCount !== undefined ? incomingCount : "—"} incoming
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center rounded-full bg-[var(--bg-base)] border border-[var(--border-default)] p-1 text-xs font-mono">
                <button
                  onClick={() => setActiveTab("map")}
                  className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                    activeTab === "map"
                      ? "bg-[var(--accent)] text-[var(--accent-ink)] font-bold"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                  aria-pressed={activeTab === "map"}
                >
                  Star Map
                </button>
                <button
                  onClick={() => setActiveTab("list")}
                  className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                    activeTab === "list"
                      ? "bg-[var(--accent)] text-[var(--accent-ink)] font-bold"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                  aria-pressed={activeTab === "list"}
                >
                  List View
                </button>
              </div>

              <Button
                tone="accent"
                scale="compact"
                onClick={() => setShowVouchForm((v) => !v)}
              >
                {showVouchForm ? "Close Form" : "Vouch for someone"}
              </Button>
            </div>
          </div>

          {/* Vouch Form Toggle */}
          {showVouchForm && (
            <div className="pt-2">
              <VouchForm
                currentOutgoingCount={outgoing.length}
                onSuccess={() => {
                  refetchAll();
                  refetchTotals();
                }}
              />
            </div>
          )}

          {/* Visual Presentation: StarMap or ListView */}
          {activeTab === "map" ? (
            <StarMap
              centerAddress={userAddress}
              outgoing={outgoing}
              incoming={incoming}
              scannedRangeText={scannedRange}
            />
          ) : (
            <ListView
              centerAddress={userAddress}
              outgoing={outgoing}
              incoming={incoming}
            />
          )}
        </section>
      ) : (
        /* Visitor Unconnected Showcase */
        <section className="space-y-6">
          <Panel variant="surface" className="text-center py-10 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-[rgba(255,158,207,0.12)] flex items-center justify-center text-[var(--accent)]">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
              </svg>
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                Connect your wallet to see your web of trust
              </h2>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Connect your wallet to map your incoming and outgoing vouches, or look up any wallet address above to explore its constellation.
              </p>
            </div>

            {/* Quick Demo Star Links */}
            <div className="pt-4 border-t border-[var(--border-subtle)] max-w-lg mx-auto">
              <p className="text-xs font-mono text-[var(--text-secondary)] mb-3">
                Or explore example constellations:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Link
                  href="/a/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
                  className="px-3 py-1.5 rounded-full text-xs font-mono bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--accent)] transition-colors no-underline"
                >
                  Lead Anchor (4 out, 3 in) →
                </Link>
                <Link
                  href="/a/0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"
                  className="px-3 py-1.5 rounded-full text-xs font-mono bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--accent)] transition-colors no-underline"
                >
                  Active Hub (9 out) →
                </Link>
              </div>
            </div>
          </Panel>
        </section>
      )}

      {/* Mandatory Limitation Disclosure */}
      <LimitsBanner />
    </div>
  );
}
