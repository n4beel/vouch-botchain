import Link from "next/link";
import Panel from "@/components/ui/Panel";

export default function NotFound() {
  return (
    <div className="w-full max-w-lg mx-auto py-16 space-y-4">
      <Panel variant="elevated" className="text-center py-12 space-y-4">
        <div className="text-[var(--accent)] text-4xl font-mono">✦</div>
        <h1 className="text-2xl font-bold font-mono text-[var(--text-primary)]">
          404 — Void in the Sky
        </h1>
        <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
          The coordinate or address you are looking for does not exist in this constellation.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-block px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-ink)] no-underline"
          >
            Return to Constellation
          </Link>
        </div>
      </Panel>
    </div>
  );
}
