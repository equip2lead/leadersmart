// Marker-pen highlight behind a single headline word. The bar is a
// sibling painted under the text (via `relative` on the text rather than
// a negative z-index, so it survives ancestors that open no stacking
// context) and skewed a degree so it reads as a hand stroke rather than
// a CSS rectangle.
//
// `inset-x` bleeds slightly past the glyphs and the top inset leaves the
// ascenders clear — both are in `em` so the bar tracks the headline's
// clamped font size instead of drifting at large viewports.

const TONE_CLASSES = {
  yellow: 'bg-[#EFCB4A]',
  sage: 'bg-[#A8C79A]',
} as const;

// `marker` leaves the ascenders clear, which is what makes it read as a
// hand stroke. That only works when the text is legible against the
// section behind it as well as against the bar. On the navy CTA it is
// not — navy type on a navy ground means the cap of the "S" and the tail
// of the "y" simply vanish — so `block` extends the bar past the full
// glyph box and keeps every stroke on yellow.
const GEOMETRY = {
  marker: '-inset-x-[0.06em] bottom-[0.06em] top-[0.16em]',
  block: '-inset-x-[0.1em] -bottom-[0.14em] top-[0.02em]',
} as const;

export function Highlight({
  children,
  tone = 'yellow',
  variant = 'marker',
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONE_CLASSES;
  variant?: keyof typeof GEOMETRY;
}) {
  return (
    <span className="relative inline-block">
      <span
        aria-hidden="true"
        className={`absolute -skew-y-1 rounded-[3px] ${GEOMETRY[variant]} ${TONE_CLASSES[tone]}`}
      />
      <span className="relative">{children}</span>
    </span>
  );
}
