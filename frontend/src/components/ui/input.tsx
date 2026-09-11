import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`h-10 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--paper)] px-3 text-sm text-[var(--ink)] outline-none transition-colors focus-visible:border-[var(--terracotta)] focus-visible:ring-2 focus-visible:ring-[var(--terracotta-soft)] ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";
