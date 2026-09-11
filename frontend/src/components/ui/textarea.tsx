import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`w-full rounded-xl border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none transition-colors focus-visible:border-[var(--terracotta)] focus-visible:ring-2 focus-visible:ring-[var(--terracotta-soft)] ${className}`}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
