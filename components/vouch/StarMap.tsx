"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Address } from "viem";
import {
  type Edge,
  type IngoingEdge,
  type StarNode,
  layoutStar,
  formatShortAddress,
  formatSinceDate,
} from "@/lib/vouch";

interface StarMapProps {
  centerAddress: Address;
  outgoing: Edge[];
  incoming: IngoingEdge[];
  scannedRangeText?: string;
}

export default function StarMap({
  centerAddress,
  outgoing,
  incoming,
  scannedRangeText,
}: StarMapProps) {
  const router = useRouter();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const layout = layoutStar(centerAddress, outgoing, incoming, 800, 600);
  const activeNode =
    layout.nodes.find((n) => n.id === (hoveredNodeId || selectedNodeId)) || layout.centerNode;

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (layout.nodes.length <= 1) return;
    const currentIndex = layout.nodes.findIndex((n) => n.id === selectedNodeId);

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % layout.nodes.length;
      setSelectedNodeId(layout.nodes[nextIndex].id);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + layout.nodes.length) % layout.nodes.length;
      setSelectedNodeId(layout.nodes[prevIndex].id);
    } else if (e.key === "Enter" && selectedNodeId) {
      const node = layout.nodes.find((n) => n.id === selectedNodeId);
      if (node && node.address.toLowerCase() !== centerAddress.toLowerCase()) {
        router.push(`/a/${node.address}`);
      }
    }
  };

  const innerRadius = Math.min(layout.width, layout.height) * 0.25;
  const outerRadius = Math.min(layout.width, layout.height) * 0.42;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative flex flex-col items-center w-full rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 sm:p-6 outline-none focus:ring-1 focus:ring-[var(--accent)] select-none overflow-hidden"
      aria-label="Interactive Constellation Star Map. Use arrow keys to navigate between stars, Enter to re-center on an address."
    >
      {/* Top Map HUD Info */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 text-xs font-mono mb-2 z-10">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[var(--accent)] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            {outgoing.length} Outgoing
          </span>
          <span className="text-[var(--border-default)]">|</span>
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span className="w-2 h-2 rounded-full bg-[#8BE0B0]" />
            {incoming.length} Incoming
          </span>
        </div>

        {scannedRangeText && (
          <span className="text-[11px] text-[var(--text-muted)]">
            {scannedRangeText}
          </span>
        )}
      </div>

      {/* SVG Celestial Sky */}
      <div className="w-full max-w-[760px] aspect-[4/3] relative flex items-center justify-center">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="w-full h-full"
          role="img"
          aria-label={`Constellation graph centered on ${centerAddress}`}
        >
          <defs>
            {/* Edge arrowhead markers */}
            <marker
              id="arrow-out"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#FF9ECF" />
            </marker>
            <marker
              id="arrow-in"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#8BE0B0" />
            </marker>

            {/* Star glow filter */}
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Guide Rings */}
          <circle
            cx={layout.centerNode.x}
            cy={layout.centerNode.y}
            r={innerRadius}
            fill="none"
            stroke="var(--ring-guide)"
            strokeWidth="1"
            strokeDasharray="2 4"
          />
          <circle
            cx={layout.centerNode.x}
            cy={layout.centerNode.y}
            r={outerRadius}
            fill="none"
            stroke="var(--ring-guide)"
            strokeWidth="1"
            strokeDasharray="2 4"
          />

          {/* Directed Edges */}
          {layout.edges.map((edge) => {
            const isOut = edge.direction === "outgoing";
            const isHighlighted =
              hoveredNodeId === `out-${edge.to}` ||
              hoveredNodeId === `in-${edge.from}` ||
              selectedNodeId === `out-${edge.to}` ||
              selectedNodeId === `in-${edge.from}`;

            return (
              <g key={edge.id} className="transition-opacity">
                <line
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                  stroke={isOut ? "#FF9ECF" : "#8BE0B0"}
                  strokeWidth={isHighlighted ? "2" : "1"}
                  strokeOpacity={isHighlighted ? "0.9" : "0.45"}
                  className="edge-flow"
                  markerEnd={isOut ? "url(#arrow-out)" : "url(#arrow-in)"}
                />
              </g>
            );
          })}

          {/* Star Nodes */}
          {layout.nodes.map((node) => {
            const isCenter = node.role === "center";
            const isSelected = node.id === selectedNodeId;
            const isHovered = node.id === hoveredNodeId;
            const isMutual = node.role === "both";
            const isOut = node.role === "out";

            const starColor = isCenter
              ? "#FF9ECF"
              : isMutual
              ? "#FFD59A"
              : isOut
              ? "#FF9ECF"
              : "#8BE0B0";

            return (
              <g
                key={node.id}
                tabIndex={0}
                role="button"
                aria-label={`Wallet ${node.address}${node.label ? `, vouched as "${node.label}"` : ""}`}
                className="cursor-pointer group focus:outline-none"
                onClick={() => {
                  setSelectedNodeId(node.id);
                  if (!isCenter) {
                    router.push(`/a/${node.address}`);
                  }
                }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onFocus={() => setSelectedNodeId(node.id)}
              >
                {/* Glow ring on hover/select */}
                {(isSelected || isHovered || isCenter) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isCenter ? 26 : 18}
                    fill={starColor}
                    fillOpacity="0.18"
                    filter="url(#glow)"
                  />
                )}

                {/* 4-pointed Star polygon */}
                {isCenter ? (
                  <path
                    d={`M ${node.x} ${node.y - 14} L ${node.x + 4.5} ${node.y - 4.5} L ${node.x + 14} ${node.y} L ${node.x + 4.5} ${node.y + 4.5} L ${node.x} ${node.y + 14} L ${node.x - 4.5} ${node.y + 4.5} L ${node.x - 14} ${node.y} L ${node.x - 4.5} ${node.y - 4.5} Z`}
                    fill={starColor}
                    className="center-star-pulse"
                  />
                ) : (
                  <path
                    d={`M ${node.x} ${node.y - 7} L ${node.x + 2.5} ${node.y - 2.5} L ${node.x + 7} ${node.y} L ${node.x + 2.5} ${node.y + 2.5} L ${node.x} ${node.y + 7} L ${node.x - 2.5} ${node.y + 2.5} L ${node.x - 7} ${node.y} L ${node.x - 2.5} ${node.y - 2.5} Z`}
                    fill={starColor}
                    stroke="var(--bg-base)"
                    strokeWidth="1"
                  />
                )}

                {/* Address & Label tag */}
                <text
                  x={node.x}
                  y={node.y + (isCenter ? 26 : 18)}
                  textAnchor="middle"
                  fill={isCenter ? "#FF9ECF" : "var(--text-secondary)"}
                  className="text-[10px] font-mono select-none"
                  fontWeight={isCenter ? "bold" : "normal"}
                >
                  {isCenter ? "Viewed Target" : formatShortAddress(node.address)}
                </text>
                {node.label && (
                  <text
                    x={node.x}
                    y={node.y + (isCenter ? 38 : 28)}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    className="text-[9px] font-sans"
                  >
                    "{node.label}"
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Selected Star Details Card (Floating Overlay) */}
        {activeNode && (
          <div
            className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs p-3 rounded-lg backdrop-blur-md border border-[var(--border-default)] bg-[rgba(18,26,71,0.92)] text-xs z-20 shadow-xl"
            role="region"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-mono text-[var(--accent)] font-semibold">
                {formatShortAddress(activeNode.address)}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                {activeNode.role === "center"
                  ? "Center Target"
                  : activeNode.role === "both"
                  ? "Mutual Vouch"
                  : activeNode.role === "out"
                  ? "Outgoing Endorsement"
                  : "Incoming Endorsement"}
              </span>
            </div>
            {activeNode.label && (
              <p className="text-[var(--text-primary)] font-medium mb-1">
                Label: <span className="italic">"{activeNode.label}"</span>
              </p>
            )}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border-subtle)] text-[11px]">
              <span className="text-[var(--text-muted)] font-mono">
                {activeNode.address.toLowerCase() === centerAddress.toLowerCase()
                  ? "Viewing Current Constellation"
                  : "Click star to view map"}
              </span>
              {activeNode.address.toLowerCase() !== centerAddress.toLowerCase() && (
                <Link
                  href={`/a/${activeNode.address}`}
                  className="text-[var(--accent)] hover:underline font-semibold"
                >
                  Explore →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend Strip directly underneath explaining rings */}
      <div className="w-full mt-4 pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-around gap-y-2 gap-x-4 text-[11px] font-mono text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF9ECF]" />
          <span>Center: Target Wallet</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border border-dashed border-[#FF9ECF]" />
          <span>Inner Ring: Outgoing Endorsements</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border border-dashed border-[#8BE0B0]" />
          <span>Outer Ring: Incoming Vouches</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFD59A]" />
          <span>Mutual Endorsement</span>
        </div>
      </div>
    </div>
  );
}
