import { ButtonHTMLAttributes, forwardRef } from "react";
import { motion } from "framer-motion";
import { Link, LinkProps } from "react-router-dom";

type Variant = "default" | "ghost" | "outline" | "destructive";
type Size = "default" | "sm" | "lg" | "icon" | "icon-sm";

const base = "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50";

const variantClass: Record<Variant, string> = {
  default: "bg-[var(--terracotta)] text-[var(--on-accent)] hover:bg-[var(--terracotta-deep)] hover:text-[var(--paper)]",
  ghost: "bg-transparent text-[var(--ink-soft)] hover:bg-[var(--sand)]",
  outline: "border border-[var(--line-strong)] bg-transparent hover:bg-[var(--sand)]",
  destructive: "bg-[var(--destructive)] text-[var(--on-destructive)] hover:bg-[var(--destructive-deep)]",
};

const sizeClass: Record<Size, string> = {
  default: "h-10 px-4",
  sm: "h-9 px-3 text-xs",
  lg: "h-11 px-5",
  icon: "size-10 rounded-full",
  "icon-sm": "size-8 rounded-full",
};

export function buttonVariants({ variant = "default", size = "default", className = "" }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return `${base} ${variantClass[variant]} ${sizeClass[size]} ${className}`.trim();
}

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragEnd" | "onDragStart" | "onAnimationStart"> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => (
    <motion.button
      ref={ref}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 550, damping: 28 }}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  )
);
Button.displayName = "Button";

export function LinkButton({ variant = "default", size = "default", className = "", ...props }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonVariants({ variant, size, className })} {...props} />;
}
