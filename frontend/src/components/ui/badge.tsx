import { HTMLAttributes } from "react";

export function Badge({ className = "", variant = "default", ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "outline" }) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold";
  const variantClass = variant === "outline" ? "border border-[var(--line-strong)] text-[var(--muted-ink)]" : "bg-[var(--sand)] text-[var(--ink-soft)]";
  return <span className={`${base} ${variantClass} ${className}`} {...props} />;
}
