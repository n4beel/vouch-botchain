"use client";

import { useState } from "react";
import { isAddress, getAddress, type Address } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { useWriteContract } from "@/lib/useChainWrite";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";
import { vouchAbi } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment, isDeployed } from "@/lib/botchain/deployment";
import { encodeLabel, MAX_OUT, MAX_LABEL_BYTES } from "@/lib/vouch";
import { describeError } from "@/lib/errors";

interface VouchFormProps {
  currentOutgoingCount: number;
  onSuccess?: () => void;
}

export default function VouchForm({
  currentOutgoingCount,
  onSuccess,
}: VouchFormProps) {
  const { address: userAddress, isConnected } = useAccount();
  const [targetInput, setTargetInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);

  const deployment = getDeployment(activeBotChain.id);
  const deployed = isDeployed(activeBotChain.id);

  const {
    writeContract,
    data: txHash,
    isPending: isAwaitingWallet,
    error: writeError,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({ hash: txHash });

  const isAtCap = currentOutgoingCount >= MAX_OUT;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError(null);

    if (!isConnected || !userAddress) {
      setCustomError("Connect your wallet to vouch for an address.");
      return;
    }

    if (isAtCap) {
      setCustomError("You can vouch for 10 addresses. Remove one first.");
      return;
    }

    const trimmedTarget = targetInput.trim();
    if (!isAddress(trimmedTarget)) {
      setCustomError("Please enter a valid BOT Chain address.");
      return;
    }

    const checksumTarget = getAddress(trimmedTarget);
    if (checksumTarget.toLowerCase() === userAddress.toLowerCase()) {
      setCustomError("That can't be vouched for. You cannot vouch for yourself.");
      return;
    }

    let encoded;
    try {
      encoded = encodeLabel(labelInput);
    } catch (err: any) {
      setCustomError(err.message || "Invalid label.");
      return;
    }

    writeContract(
      {
        address: deployment.address,
        abi: vouchAbi,
        functionName: "vouch",
        args: [checksumTarget, encoded],
      },
      {
        onSuccess: () => {
          setTargetInput("");
          setLabelInput("");
          if (onSuccess) onSuccess();
        },
      },
    );
  };

  const isBusy = isAwaitingWallet || isConfirming;
  const explorerUrl = txHash ? `${activeBotChain.blockExplorers.default.url}/tx/${txHash}` : null;

  return (
    <Panel
      variant="surface"
      title="Vouch for someone"
      className="w-full max-w-xl mx-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Outgoing Cap Counter */}
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[var(--text-secondary)]">Your Outgoing Vouches</span>
          <span
            className={
              isAtCap
                ? "text-[var(--warning)] font-bold"
                : "text-[var(--text-primary)]"
            }
          >
            {currentOutgoingCount} / {MAX_OUT}
          </span>
        </div>

        {isAtCap && (
          <div
            className="p-3 rounded-lg border border-[var(--warning)] bg-[rgba(255,213,154,0.08)] text-xs text-[var(--warning)]"
            role="alert"
          >
            You can vouch for 10 addresses. Remove one first before creating another vouch.
          </div>
        )}

        {/* Target Address Input */}
        <div className="space-y-1.5">
          <label
            htmlFor="target-address"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono"
          >
            Address to vouch for
          </label>
          <input
            id="target-address"
            type="text"
            required
            disabled={isBusy || isAtCap || !deployed}
            value={targetInput}
            onChange={(e) => {
              setTargetInput(e.target.value);
              setCustomError(null);
            }}
            placeholder="0x…"
            className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm font-mono placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-50"
          />
        </div>

        {/* Label Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="vouch-label"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono"
            >
              Label (optional context)
            </label>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              {labelInput.length}/{MAX_LABEL_BYTES}
            </span>
          </div>
          <input
            id="vouch-label"
            type="text"
            maxLength={MAX_LABEL_BYTES}
            disabled={isBusy || isAtCap || !deployed}
            value={labelInput}
            onChange={(e) => {
              setLabelInput(e.target.value);
              setCustomError(null);
            }}
            placeholder="how you know them (16 characters)"
            className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-50"
          />
        </div>

        {/* Gas estimation & notices */}
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono pt-1">
          <span>Est. gas: ~0.002 BOT</span>
          <span>Free to revoke anytime</span>
        </div>

        {/* Validation or Revert Error Surfacing */}
        {(customError || writeError) && (
          <div
            className="p-3 rounded-lg border border-[var(--danger)] bg-[rgba(255,179,199,0.08)] text-xs text-[var(--danger)] leading-relaxed"
            role="alert"
          >
            {customError || describeError(writeError)}
          </div>
        )}

        {/* Success Announcement */}
        {isConfirmed && (
          <div
            className="p-3 rounded-lg border border-[var(--success)] bg-[rgba(139,224,176,0.08)] text-xs text-[var(--success)] space-y-1"
            role="status"
            aria-live="polite"
          >
            <p className="font-semibold">Vouch successfully confirmed on-chain!</p>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="underline block font-mono text-[11px]"
              >
                View on BOT Chain Explorer →
              </a>
            )}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          tone="accent"
          scale="broad"
          busy={isBusy}
          disabled={!deployed || isAtCap || isBusy}
        >
          {isAwaitingWallet
            ? "Awaiting Wallet…"
            : isConfirming
            ? "Confirming On-Chain…"
            : isAtCap
            ? "10 / 10 Vouches Used"
            : "Vouch for this address"}
        </Button>
      </form>
    </Panel>
  );
}
