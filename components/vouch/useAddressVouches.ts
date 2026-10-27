"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { Address } from "viem";
import { usePublicClient, useReadContract } from "wagmi";
import { vouchAbi } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment, isDeployed } from "@/lib/botchain/deployment";
import { getLogsChunked } from "@/lib/logs";
import {
  type Edge,
  type IngoingEdge,
  decodeLabel,
  foldIncomingEdges,
} from "@/lib/vouch";

export function useAddressVouches(targetAddress?: Address) {
  const publicClient = usePublicClient(); // stable-hook-result
  const deployment = getDeployment(activeBotChain.id);
  const deployed = isDeployed(activeBotChain.id);

  const [incomingEdges, setIncomingEdges] = useState<IngoingEdge[] | undefined>(undefined);
  const [logsError, setLogsError] = useState<boolean>(false);
  const [scannedRange, setScannedRange] = useState<string | undefined>(undefined);
  const [isScanningLogs, setIsScanningLogs] = useState<boolean>(false);

  // Read outgoing edges from contract
  const {
    data: outgoingData,
    isLoading: isOutgoingLoading,
    refetch: refetchOutgoing,
    error: outgoingError,
  } = useReadContract({
    address: deployment.address,
    abi: vouchAbi,
    functionName: "outgoing",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: Boolean(targetAddress && deployed),
    },
  });

  // Read incoming count from contract
  const {
    data: incomingCountData,
    isLoading: isIncomingCountLoading,
    refetch: refetchIncomingCount,
    error: incomingCountError,
  } = useReadContract({
    address: deployment.address,
    abi: vouchAbi,
    functionName: "incoming",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: Boolean(targetAddress && deployed),
    },
  });

  // Parse outgoing edges
  const outgoing: Edge[] = useMemo(() => {
    if (!outgoingData) return [];
    const [tos, labels, sinces] = outgoingData;
    return tos.map((to, i) => ({
      to,
      label: decodeLabel(labels[i]),
      rawLabel: labels[i],
      since: sinces[i],
    }));
  }, [outgoingData]);

  // Fetch incoming edges via event logs
  const fetchIncomingLogs = useCallback(async () => {
    if (!publicClient || !targetAddress || !deployed) return;
    setIsScanningLogs(true);
    setLogsError(false);

    try {
      const vouchEvent = vouchAbi.find(
        (e) => e.type === "event" && e.name === "Vouched",
      ) as any;
      const unvouchEvent = vouchAbi.find(
        (e) => e.type === "event" && e.name === "Unvouched",
      ) as any;

      const fromBlock = deployment.deployBlock > 0n ? deployment.deployBlock : 1n;

      // Query both Vouched and Unvouched logs
      const [vouchedResult, unvouchedResult] = await Promise.all([
        getLogsChunked({
          client: publicClient,
          address: deployment.address,
          event: vouchEvent,
          fromBlock,
        }),
        getLogsChunked({
          client: publicClient,
          address: deployment.address,
          event: unvouchEvent,
          fromBlock,
        }),
      ]);

      const mergedLogs = [
        ...vouchedResult.logs.map((l: any) => ({
          eventName: "Vouched" as const,
          args: l.args,
          blockNumber: l.blockNumber,
          transactionIndex: l.transactionIndex,
          logIndex: l.logIndex,
        })),
        ...unvouchedResult.logs.map((l: any) => ({
          eventName: "Unvouched" as const,
          args: l.args,
          blockNumber: l.blockNumber,
          transactionIndex: l.transactionIndex,
          logIndex: l.logIndex,
        })),
      ];

      const folded = foldIncomingEdges(mergedLogs, targetAddress);
      setIncomingEdges(folded);
      setScannedRange(
        `Scanned #${vouchedResult.scannedFrom}–#${vouchedResult.scannedTo}${
          vouchedResult.complete ? " (complete)" : " (partial)"
        }`,
      );
    } catch (err) {
      console.error("Log scan failed:", err);
      setLogsError(true);
      setIncomingEdges(undefined);
    } finally {
      setIsScanningLogs(false);
    }
  }, [publicClient, targetAddress, deployed, deployment.address, deployment.deployBlock]);

  useEffect(() => {
    fetchIncomingLogs();
  }, [fetchIncomingLogs]);

  const refetchAll = useCallback(() => {
    refetchOutgoing();
    refetchIncomingCount();
    fetchIncomingLogs();
  }, [refetchOutgoing, refetchIncomingCount, fetchIncomingLogs]);

  return {
    deployed,
    outgoing,
    incoming: incomingEdges ?? [],
    incomingEdges,
    incomingCount: incomingCountData !== undefined ? Number(incomingCountData) : undefined,
    logsError,
    scannedRange,
    isLoading: isOutgoingLoading || isIncomingCountLoading || isScanningLogs,
    isScanningLogs,
    error: outgoingError || incomingCountError,
    refetchAll,
  };
}
