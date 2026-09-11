/**
 * EmberMark — the journal's own small mark for streaks and rhythm.
 * A hand-drawn feeling ember/flame: an outer glow petal with an inner
 * tongue of fire. Replaces the generic lucide Flame where streaks appear.
 */
export default function EmberMark({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      data-testid="ember-mark"
    >
      <path
        d="M12 2.5c.8 3.2-.6 5.3-2.3 7C8.2 11 7 12.6 7 15a5 5 0 0 0 10 0c0-1.5-.5-2.8-1.3-4-.4 1-1 1.8-2 2.4.5-2.9-.3-7.4-1.7-10.9Z"
        fill="currentColor"
        opacity="0.92"
      />
      <path
        d="M12 21.5a3.4 3.4 0 0 1-3.4-3.4c0-1.2.6-2.2 1.4-3 .7-.7 1.5-1.4 2-2.4.5 1 .9 1.9 1 3 .2-.3.4-.8.5-1.3.6 1 1 2 1 3.1a3.4 3.4 0 0 1-2.5 4Z"
        fill="var(--paper)"
        opacity="0.85"
      />
    </svg>
  );
}
