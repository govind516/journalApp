import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DialogContent({ children, ...props }: { children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-xl" {...props}>
      {children}
    </div>
  );
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

export function DialogTitle({ children, ...props }: { children: ReactNode } & React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className="font-serif text-xl" {...props}>{children}</h2>;
}

export function DialogDescription({ children, ...props }: { children: ReactNode } & React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className="mt-2 text-sm text-[var(--muted-ink)]" {...props}>{children}</p>;
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}
