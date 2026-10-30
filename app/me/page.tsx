"use client";

import { useState } from "react";
import Link from "next/link";
import { type Address } from "viem";
import { useAccount } from "wagmi";
import { useWaitForTransactionReceipt } from "@/lib/useChainWrite";
import { useWriteContract } from "@/lib/useChainWrite";
import { vouchAbi } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment, isDeployed } from "@/lib/botchain/deployment";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";
import ConnectButton from "@/components/ui/ConnectButton";
import ListView from "@/components/vouch/ListView";
import VouchForm from "@/components/vouch/VouchForm";
import LimitsBanner from "@/components/vouch/LimitsBanner";
import { useAddressVouches } from "@/components/vouch/useAddressVouches";
import { describeError } from "@/lib/errors";
import { formatShortAddress } from "@/lib/vouch";

export default function MePage() {
  const { address: userAddress, isConnected } = useAccount();
  const deployment = getDeployment(activeBotChain.id);
  const deployed = isDeployed(activeBotChain.id);

  const [revokingTarget, setRevokingTarget] = useState<Address | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const {
    outgoing,
    incoming,
    incomingCount,
    logsError,
    isLoading,
    refetchAll,
  } = useAddressVouches(userAddress);

  const {
    writeContract,
    data: revokeTxHash,
    isPending: isAwaitingRevoke,
    error: writeRevokeError,
  } = useWriteContract();

  const { isLoading: isConfirmingRevoke } = useWaitForTransactionReceipt({
    hash: revokeTxHash,
  });

  const handleUnvouch = (target: Address) => {
    if (!deployed || !userAddress) return;
    setRevokingTarget(target);
    setRevokeError(null);

    writeContract(
      {
        address: deployment.address,
        abi: vouchAbi,
        functionName: "unvouch",
        args: [target],
      },
      {
        onSuccess: () => {
          refetchAll();
          setRevokingTarget(null);
        },
        onError: (err) => {
          setRevokeError(describeError(err));
          setRevokingTarget(null);
        },
      },
    );
  };

  if (!isConnected || !userAddress) {
    return (
      <div className="w-full max-w-lg mx-auto space-y-6 pt-12">
        <Panel variant="surface" className="text-center py-12 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-[rgba(255,158,207,0.12)] flex items-center justify-center text-[var(--accent)] text-xl font-mono">
            ✦
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Connect your wallet to manage vouches
          </h1>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
            Manage your outgoing endorsements, revoke existing vouches, and inspect who vouches for you.
          </p>
          <div className="pt-2 max-w-xs mx-auto">
            <ConnectButton />
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Overview Card */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
            <h1 className="text-base sm:text-lg font-mono font-bold text-[var(--text-primary)]">
              Manage Vouches: {formatShortAddress(userAddress)}
            </h1>
          </div>
          <p className="text-xs text-[var(--text-muted)] font-mono">
            {outgoing.length} of 10 outgoing endorsements active ·{" "}
            {logsError ? "—" : incomingCount !== undefined ? incomingCount : "—"} incoming
          </p>
        </div>

        <Link
          href={`/a/${userAddress}`}
          className="text-xs font-mono font-semibold text-[var(--accent)] hover:underline flex items-center gap-1 self-start sm:self-auto"
        >
          View Live Constellation Map →
        </Link>
      </section>

      {/* Revocation Error or Status */}
      {(revokeError || writeRevokeError) && (
        <div
          className="p-3.5 rounded-xl border border-[var(--danger)] bg-[rgba(255,179,199,0.08)] text-xs text-[var(--danger)] leading-relaxed"
          role="alert"
        >
          {revokeError || describeError(writeRevokeError)}
        </div>
      )}

      {/* Side by side: Outgoing Management & Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Outgoing List with Revoke buttons */}
        <div className="lg:col-span-7 space-y-6">
          <ListView
            centerAddress={userAddress}
            outgoing={outgoing}
            incoming={incoming}
            canUnvouch={true}
            onUnvouch={handleUnvouch}
          />
        </div>

        {/* Add Vouch Form */}
        <div className="lg:col-span-5">
          <VouchForm
            currentOutgoingCount={outgoing.length}
            onSuccess={() => refetchAll()}
          />
        </div>
      </div>

      <LimitsBanner />
    </div>
  );
}
