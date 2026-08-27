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

export function Highlight({
  children,
  tone = 'yellow',
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONE_CLASSES;
}) {
  return (
    <span className="relative inline-block">
      <span
        aria-hidden="true"
        className={`absolute -inset-x-[0.06em] bottom-[0.06em] top-[0.16em] -skew-y-1 rounded-[3px] ${TONE_CLASSES[tone]}`}
      />
      <span className="relative">{children}</span>
    </span>
  );
}
