"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

export type VouchButtonTone = "accent" | "subtle" | "danger" | "ghost" | "primary";
export type VouchButtonScale = "compact" | "regular" | "broad" | "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: VouchButtonTone;
  variant?: VouchButtonTone;
  scale?: VouchButtonScale;
  size?: VouchButtonScale;
  busy?: boolean;
  loading?: boolean;
}

const toneMap: Record<string, { bg: string; fg: string; border: string }> = {
  accent: {
    bg: "var(--accent)",
    fg: "var(--accent-ink)",
    border: "transparent",
  },
  primary: {
    bg: "var(--accent)",
    fg: "var(--accent-ink)",
    border: "transparent",
  },
  subtle: {
    bg: "var(--bg-elevated)",
    fg: "var(--text-primary)",
    border: "var(--border-default)",
  },
  danger: {
    bg: "transparent",
    fg: "var(--danger)",
    border: "var(--danger)",
  },
  ghost: {
    bg: "transparent",
    fg: "var(--text-muted)",
    border: "var(--border-default)",
  },
};

const scaleMap: Record<string, string> = {
  compact: "min-h-[38px] px-3.5 py-1.5 text-xs font-semibold",
  sm: "min-h-[38px] px-3.5 py-1.5 text-xs font-semibold",
  regular: "min-h-[44px] px-5 py-2.5 text-sm font-semibold",
  md: "min-h-[44px] px-5 py-2.5 text-sm font-semibold",
  broad: "min-h-[48px] w-full px-6 py-3 text-sm font-bold",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      tone,
      variant,
      scale,
      size,
      busy,
      loading,
      disabled,
      children,
      className = "",
      style,
      ...props
    },
    ref,
  ) => {
    const effectiveTone = tone ?? variant ?? "accent";
    const effectiveScale = scale ?? size ?? "regular";
    const isBusy = busy || loading;
    const palette = toneMap[effectiveTone] ?? toneMap.accent;
    const sizeClasses = scaleMap[effectiveScale] ?? scaleMap.regular;
    const isDisabled = disabled || isBusy;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          "inline-flex items-center justify-center gap-2.5 rounded-full select-none",
          "tracking-wider transition-all duration-150 active:scale-[0.98]",
          "cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100",
          sizeClasses,
          className,
        ].join(" ")}
        style={{
          backgroundColor: palette.bg,
          color: palette.fg,
          border: `1px solid ${palette.border}`,
          ...style,
        }}
        {...props}
      >
        {isBusy && (
          <svg
            className="w-4 h-4 animate-spin text-current"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        <span>{children}</span>
      </button>
    );
  },
);

Button.displayName = "Button";
export default Button;
