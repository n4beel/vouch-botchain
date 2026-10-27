import { describe, expect, it } from "vitest";
import {
  encodeLabel,
  decodeLabel,
  foldIncomingEdges,
  layoutStar,
  MAX_OUT,
  MAX_LABEL_BYTES,
  formatShortAddress,
  formatSinceDate,
} from "../vouch";
import type { Address } from "viem";

const ALICE: Address = "0x1111111111111111111111111111111111111111";
const BOB: Address = "0x2222222222222222222222222222222222222222";
const CHARLIE: Address = "0x3333333333333333333333333333333333333333";
const DAVE: Address = "0x4444444444444444444444444444444444444444";

describe("lib/vouch", () => {
  it("exports MAX_OUT as 10", () => {
    expect(MAX_OUT).toBe(10);
  });

  describe("label encoding and decoding", () => {
    it("encodes and decodes ascii label correctly", () => {
      const original = "friend";
      const encoded = encodeLabel(original);
      expect(encoded.startsWith("0x")).toBe(true);
      expect(encoded.length).toBe(34); // 0x + 32 hex chars (16 bytes)

      const decoded = decodeLabel(encoded);
      expect(decoded).toBe(original);
    });

    it("encodes 16-character label correctly", () => {
      const original = "1234567890123456";
      const encoded = encodeLabel(original);
      const decoded = decodeLabel(encoded);
      expect(decoded).toBe(original);
    });

    it("rejects labels longer than 16 characters", () => {
      expect(() => encodeLabel("12345678901234567")).toThrow(
        `Label exceeds maximum of ${MAX_LABEL_BYTES} characters.`
      );
    });

    it("rejects non-ASCII characters", () => {
      expect(() => encodeLabel("frïend")).toThrow(
        "Labels must contain only ASCII characters."
      );
    });

    it("decodes empty or undefined gracefully", () => {
      expect(decodeLabel(undefined)).toBe("");
      expect(decodeLabel("")).toBe("");
    });
  });

  describe("foldIncomingEdges", () => {
    it("accumulates and removes incoming vouches in order", () => {
      const logs = [
        {
          eventName: "Vouched" as const,
          args: { from: BOB, to: ALICE, label: encodeLabel("coworker") },
          blockNumber: 100n,
          logIndex: 0,
        },
        {
          eventName: "Vouched" as const,
          args: { from: CHARLIE, to: ALICE, label: encodeLabel("mentor") },
          blockNumber: 105n,
          logIndex: 0,
        },
        {
          eventName: "Unvouched" as const,
          args: { from: BOB, to: ALICE },
          blockNumber: 110n,
          logIndex: 0,
        },
        {
          eventName: "Vouched" as const,
          args: { from: DAVE, to: ALICE, label: encodeLabel("collaborator") },
          blockNumber: 120n,
          logIndex: 0,
        },
      ];

      const incoming = foldIncomingEdges(logs, ALICE);
      expect(incoming.length).toBe(2);
      expect(incoming.find((e) => e.from.toLowerCase() === CHARLIE.toLowerCase())?.label).toBe("mentor");
      expect(incoming.find((e) => e.from.toLowerCase() === DAVE.toLowerCase())?.label).toBe("collaborator");
      expect(incoming.find((e) => e.from.toLowerCase() === BOB.toLowerCase())).toBeUndefined();
    });
  });

  describe("layoutStar", () => {
    it("creates deterministic positions for center, outgoing, and incoming", () => {
      const outs = [
        { to: BOB, label: "friend", rawLabel: encodeLabel("friend"), since: 1000n },
      ];
      const ins = [
        { from: CHARLIE, label: "mentor", rawLabel: encodeLabel("mentor"), since: 2000n },
      ];

      const layout1 = layoutStar(ALICE, outs, ins, 800, 600);
      const layout2 = layoutStar(ALICE, outs, ins, 800, 600);

      expect(layout1.centerNode.x).toBe(400);
      expect(layout1.centerNode.y).toBe(300);
      expect(layout1.nodes.length).toBe(3);
      expect(layout1.edges.length).toBe(2);

      // Determinism
      expect(layout1.nodes[1].x).toBe(layout2.nodes[1].x);
      expect(layout1.nodes[1].y).toBe(layout2.nodes[1].y);
      expect(layout1.nodes[2].x).toBe(layout2.nodes[2].x);
      expect(layout1.nodes[2].y).toBe(layout2.nodes[2].y);
    });

    it("marks node with both role when an address is both incoming and outgoing", () => {
      const outs = [
        { to: BOB, label: "friend", rawLabel: encodeLabel("friend"), since: 1000n },
      ];
      const ins = [
        { from: BOB, label: "peer", rawLabel: encodeLabel("peer"), since: 2000n },
      ];

      const layout = layoutStar(ALICE, outs, ins, 800, 600);
      const bobNode = layout.nodes.find((n) => n.address.toLowerCase() === BOB.toLowerCase());
      expect(bobNode).toBeDefined();
      expect(bobNode?.role).toBe("both");
      expect(layout.edges.length).toBe(2);
    });
  });

  describe("formatting helpers", () => {
    it("formats short addresses", () => {
      expect(formatShortAddress(ALICE)).toBe("0x1111…1111");
    });

    it("formats unix timestamp to date string", () => {
      expect(formatSinceDate(1760000000n)).toContain("2025");
      expect(formatSinceDate(0n)).toBe("unknown");
    });
  });
});
