import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * One calm screen change shared by every page: a short settle,
 * never a showy slide. Reduced-motion users get opacity only
 * via the global MotionConfig.
 */
export default function PageFade({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.22, 0.8, 0.24, 1] }}
    >
      {children}
    </motion.div>
  );
}
