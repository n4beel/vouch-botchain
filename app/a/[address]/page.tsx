"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { isAddress, getAddress, type Address } from "viem";
import { useAccount } from "wagmi";
import StarMap from "@/components/vouch/StarMap";
import ListView from "@/components/vouch/ListView";
import VouchForm from "@/components/vouch/VouchForm";
import AddressSearch from "@/components/vouch/AddressSearch";
import LimitsBanner from "@/components/vouch/LimitsBanner";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import { useAddressVouches } from "@/components/vouch/useAddressVouches";
import { formatShortAddress } from "@/lib/vouch";

interface AddressPageProps {
  params: Promise<{ address: string }>;
}

export default function AddressPage({ params }: AddressPageProps) {
  const resolvedParams = use(params);
  const rawParam = resolvedParams?.address || "";
  const isValid = isAddress(rawParam);
  const targetAddress: Address | undefined = isValid ? getAddress(rawParam) : undefined;

  const { address: userAddress, isConnected } = useAccount();
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

  const {
    deployed,
    outgoing,
    incoming,
    incomingCount,
    logsError,
    scannedRange,
    isLoading,
    refetchAll,
  } = useAddressVouches(targetAddress);

  // User's own vouches for cap check
  const { outgoing: userOutgoing } = useAddressVouches(userAddress);

  if (!isValid || !targetAddress) {
    return (
      <div className="w-full max-w-xl mx-auto space-y-6 pt-8">
        <Panel variant="elevated" className="text-center py-10 space-y-4">
          <div className="text-[var(--danger)] text-3xl font-mono">✦</div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            That isn't a valid address
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-mono">
            "{rawParam}" does not resolve to an EVM address on BOT Chain.
          </p>
          <div className="pt-4">
            <AddressSearch />
          </div>
        </Panel>
      </div>
    );
  }

  const isEmptySky = outgoing.length === 0 && incoming.length === 0 && !isLoading;
  const isOwnConstellation =
    userAddress && userAddress.toLowerCase() === targetAddress.toLowerCase();

  return (
    <div className="w-full space-y-6">
      {/* Address Header Summary */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
            <h1 className="text-base sm:text-lg font-mono font-bold text-[var(--text-primary)]">
              {targetAddress}
            </h1>
          </div>
          <p className="text-xs text-[var(--text-muted)] font-mono">
            {outgoing.length} outgoing /{" "}
            {logsError ? "—" : incomingCount !== undefined ? incomingCount : "—"} incoming
            {isOwnConstellation && (
              <span className="ml-2 text-[var(--accent)] font-semibold">(Your Wallet)</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
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

          {!isOwnConstellation && isConnected && (
            <Button
              tone="accent"
              scale="compact"
              onClick={() => setShowVouchForm((v) => !v)}
            >
              {showVouchForm ? "Close Form" : "Vouch for this wallet"}
            </Button>
          )}
        </div>
      </section>

      {/* Vouch Form (if triggered) */}
      {showVouchForm && (
        <VouchForm
          currentOutgoingCount={userOutgoing.length}
          onSuccess={() => {
            refetchAll();
            setShowVouchForm(false);
          }}
        />
      )}

      {/* Empty Sky State */}
      {isEmptySky ? (
        <Panel variant="hollow" className="text-center py-16 border-dashed space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full bg-[rgba(255,158,207,0.1)] flex items-center justify-center text-[var(--accent)]">
            ✦
          </div>
          <h2 className="text-base font-bold text-[var(--text-primary)] font-mono">
            Empty Sky
          </h2>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            No one has vouched for this address yet, and it has not endorsed any wallets.
          </p>
          {!isOwnConstellation && isConnected && (
            <div className="pt-2">
              <Button
                tone="accent"
                scale="regular"
                onClick={() => setShowVouchForm(true)}
              >
                Be the first to vouch
              </Button>
            </div>
          )}
        </Panel>
      ) : activeTab === "map" ? (
        <StarMap
          centerAddress={targetAddress}
          outgoing={outgoing}
          incoming={incoming}
          scannedRangeText={scannedRange}
        />
      ) : (
        <ListView
          centerAddress={targetAddress}
          outgoing={outgoing}
          incoming={incoming}
        />
      )}

      {/* Quick Search */}
      <div className="pt-4">
        <AddressSearch />
      </div>

      {/* Limitations */}
      <LimitsBanner />
    </div>
  );
}
