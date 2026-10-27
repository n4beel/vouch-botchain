import { type HTMLAttributes, type ReactNode } from "react";

export interface ConstellationPanelProps extends HTMLAttributes<HTMLDivElement> {
  badge?: ReactNode;
  title?: string;
  variant?: "surface" | "elevated" | "hollow";
  compact?: boolean;
}

export default function Panel({
  badge,
  title,
  variant = "surface",
  compact = false,
  children,
  className = "",
  style,
  ...rest
}: ConstellationPanelProps) {
  const bgStyle =
    variant === "elevated"
      ? "var(--bg-elevated)"
      : variant === "hollow"
      ? "transparent"
      : "var(--bg-surface)";

  return (
    <section
      className={[
        "relative rounded-xl transition-colors",
        compact ? "p-3.5 sm:p-4" : "p-5 sm:p-6",
        className,
      ].join(" ")}
      style={{
        background: bgStyle,
        border: "1px solid var(--border-default)",
        boxShadow: "0 4px 20px rgba(10, 15, 44, 0.4)",
        ...style,
      }}
      {...rest}
    >
      {(title || badge) && (
        <header className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--border-subtle)]">
          {title && (
            <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--text-secondary)] font-mono">
              {title}
            </h2>
          )}
          {badge && <div className="flex-shrink-0">{badge}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
