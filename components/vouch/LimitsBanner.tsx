import Panel from "@/components/ui/Panel";

export default function LimitsBanner() {
  return (
    <Panel
      variant="hollow"
      className="mt-8 border-dashed border-[var(--border-default)]"
      title="What a vouch isn't"
    >
      <ul className="space-y-2.5 text-xs text-[var(--text-secondary)] list-disc list-inside leading-relaxed">
        <li>
          <strong className="text-[var(--text-primary)]">It is an opinion. Nothing checks it.</strong>{" "}
          A vouch only records what one wallet says about another; nobody verifies the label or validates their relationship.
        </li>
        <li>
          <strong className="text-[var(--text-primary)]">Wallets are free. A ring of them can vouch for each other.</strong>{" "}
          Because anyone can generate unlimited addresses, Sybil rings can endorse one another. Always read <em>who</em> vouches, not just the count.
        </li>
        <li>
          <strong className="text-[var(--text-primary)]">There is no score here, and there won't be one.</strong>{" "}
          Vouch does not compute numeric reputation, trust scores, or ranking algorithms.
        </li>
      </ul>
    </Panel>
  );
}
