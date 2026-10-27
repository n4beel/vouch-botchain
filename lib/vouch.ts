import type { Address, Hex } from "viem";
import { getAddress, isAddress } from "viem";

export const MAX_OUT = 10;
export const MAX_LABEL_BYTES = 16;

export interface Edge {
  to: Address;
  label: string;
  rawLabel: Hex;
  since: bigint;
}

export interface IngoingEdge {
  from: Address;
  label: string;
  rawLabel: Hex;
  since: bigint;
}

export interface StarNode {
  id: string;
  address: Address;
  role: "center" | "out" | "in" | "both";
  x: number;
  y: number;
  label?: string;
  since?: bigint;
}

export interface StarEdge {
  id: string;
  from: Address;
  to: Address;
  label: string;
  since: bigint;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  direction: "outgoing" | "incoming";
}

export interface StarMapLayout {
  width: number;
  height: number;
  centerNode: StarNode;
  nodes: StarNode[];
  edges: StarEdge[];
}

/**
 * Encodes a label string into bytes16 hex.
 * Rejects non-ASCII or strings longer than 16 bytes.
 */
export function encodeLabel(text: string): Hex {
  const trimmed = text.trim();
  // Check ASCII
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed.charCodeAt(i) > 127) {
      throw new Error("Labels must contain only ASCII characters.");
    }
  }

  const bytes = new TextEncoder().encode(trimmed);
  if (bytes.length > MAX_LABEL_BYTES) {
    throw new Error(`Label exceeds maximum of ${MAX_LABEL_BYTES} characters.`);
  }

  const padded = new Uint8Array(16);
  padded.set(bytes);
  return `0x${Array.from(padded, (b) => b.toString(16).padStart(2, "0")).join("")}` as Hex;
}

/**
 * Decodes a bytes16 hex string back into a human string, stripping trailing null bytes.
 */
export function decodeLabel(raw: string | undefined): string {
  if (!raw || !raw.startsWith("0x")) return "";
  const hex = raw.slice(2);
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (isNaN(byte) || byte === 0) break;
    bytes.push(byte);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

export interface VouchLogItem {
  eventName: "Vouched" | "Unvouched";
  args: {
    from?: Address;
    to?: Address;
    label?: Hex;
  };
  blockNumber?: bigint;
  transactionIndex?: number;
  logIndex?: number;
}

/**
 * Reconstructs active incoming vouches for target addresses from historical logs.
 */
export function foldIncomingEdges(
  logs: VouchLogItem[],
  targetAddress: Address,
): IngoingEdge[] {
  const normTarget = targetAddress.toLowerCase();
  const activeMap = new Map<string, IngoingEdge>();

  // Sort logs in chronological order
  const sorted = [...logs].sort((a, b) => {
    const blockDiff = (a.blockNumber ?? 0n) - (b.blockNumber ?? 0n);
    if (blockDiff !== 0n) return blockDiff > 0n ? 1 : -1;
    const txDiff = (a.transactionIndex ?? 0) - (b.transactionIndex ?? 0);
    if (txDiff !== 0) return txDiff;
    return (a.logIndex ?? 0) - (b.logIndex ?? 0);
  });

  for (const log of sorted) {
    const from = log.args.from ? getAddress(log.args.from) : undefined;
    const to = log.args.to ? getAddress(log.args.to) : undefined;
    if (!from || !to) continue;

    if (to.toLowerCase() === normTarget) {
      const fromKey = from.toLowerCase();
      if (log.eventName === "Vouched") {
        const rawLabel = log.args.label ?? "0x00000000000000000000000000000000";
        activeMap.set(fromKey, {
          from,
          label: decodeLabel(rawLabel),
          rawLabel,
          since: log.blockNumber ?? 0n,
        });
      } else if (log.eventName === "Unvouched") {
        activeMap.delete(fromKey);
      }
    }
  }

  return Array.from(activeMap.values());
}

/**
 * Computes deterministic seed angle from an address so layout does not jump.
 */
function addressSeedAngle(addr: string): number {
  let hash = 0;
  for (let i = 2; i < addr.length; i++) {
    hash = (hash << 5) - hash + addr.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 360) * (Math.PI / 180);
}

/**
 * Computes SVG star map coordinates for center, outgoing, and incoming edges.
 */
export function layoutStar(
  centerAddress: Address,
  outgoing: Edge[],
  incoming: IngoingEdge[],
  width = 800,
  height = 600,
): StarMapLayout {
  const cx = width / 2;
  const cy = height / 2;
  const seed = addressSeedAngle(centerAddress);

  const centerNode: StarNode = {
    id: `center-${centerAddress}`,
    address: centerAddress,
    role: "center",
    x: cx,
    y: cy,
  };

  const nodes: StarNode[] = [centerNode];
  const edges: StarEdge[] = [];

  const innerRadius = Math.min(width, height) * 0.25;
  const outerRadius = Math.min(width, height) * 0.42;

  // Track addresses appearing in both
  const outAddresses = new Set(outgoing.map((e) => e.to.toLowerCase()));
  const inAddresses = new Set(incoming.map((e) => e.from.toLowerCase()));

  // Place outgoing stars on inner ring
  const outCount = outgoing.length;
  for (let i = 0; i < outCount; i++) {
    const e = outgoing[i];
    const angle = seed + (2 * Math.PI * i) / Math.max(1, outCount);
    const x = cx + innerRadius * Math.cos(angle);
    const y = cy + innerRadius * Math.sin(angle);
    const isBoth = inAddresses.has(e.to.toLowerCase());

    const node: StarNode = {
      id: `out-${e.to}`,
      address: e.to,
      role: isBoth ? "both" : "out",
      x,
      y,
      label: e.label,
      since: e.since,
    };
    nodes.push(node);

    edges.push({
      id: `edge-out-${centerAddress}-${e.to}`,
      from: centerAddress,
      to: e.to,
      label: e.label,
      since: e.since,
      x1: cx,
      y1: cy,
      x2: x,
      y2: y,
      direction: "outgoing",
    });
  }

  // Filter incoming that are not already placed as 'both'
  const inOnly = incoming.filter((e) => !outAddresses.has(e.from.toLowerCase()));
  const inCount = inOnly.length;
  const outerSeed = seed + Math.PI / 6;

  for (let j = 0; j < inCount; j++) {
    const e = inOnly[j];
    const angle = outerSeed + (2 * Math.PI * j) / Math.max(1, inCount);
    const x = cx + outerRadius * Math.cos(angle);
    const y = cy + outerRadius * Math.sin(angle);

    const node: StarNode = {
      id: `in-${e.from}`,
      address: e.from,
      role: "in",
      x,
      y,
      label: e.label,
      since: e.since,
    };
    nodes.push(node);

    edges.push({
      id: `edge-in-${e.from}-${centerAddress}`,
      from: e.from,
      to: centerAddress,
      label: e.label,
      since: e.since,
      x1: x,
      y1: y,
      x2: cx,
      y2: cy,
      direction: "incoming",
    });
  }

  // Add edges for mutual 'both' nodes that already exist on inner ring
  for (const e of incoming) {
    if (outAddresses.has(e.from.toLowerCase())) {
      const existing = nodes.find((n) => n.address.toLowerCase() === e.from.toLowerCase());
      if (existing) {
        edges.push({
          id: `edge-in-${e.from}-${centerAddress}`,
          from: e.from,
          to: centerAddress,
          label: e.label,
          since: e.since,
          x1: existing.x,
          y1: existing.y,
          x2: cx,
          y2: cy,
          direction: "incoming",
        });
      }
    }
  }

  return {
    width,
    height,
    centerNode,
    nodes,
    edges,
  };
}

export function formatShortAddress(addr: string): string {
  if (!isAddress(addr)) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatSinceDate(sinceSec: bigint): string {
  if (sinceSec <= 0n) return "unknown";
  return new Date(Number(sinceSec) * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
