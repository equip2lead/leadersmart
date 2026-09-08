// LeaderSmart wordmark — the brand mark for the authenticated app chrome.
//
// Restored from the pre-86de1e3 landing wordmark rather than re-drawn, so the
// geometry is identical to the mark this product shipped under: "Smart"
// carries a yellow highlighter bar and the trailing period is yellow, and
// that is the whole identity. There is no glyph in the mark itself.
//
// NOTE: src/app/_landing/wordmark.tsx now renders exactly this mark again.
// This file was split off while the app and the landing carried different
// names; that divergence is gone, so the two are duplicates and should be
// collapsed into one component.
//
// The highlight is a sibling span painted *before* the text and lifted back
// with `relative` on the text itself, rather than a negative z-index. A
// `-z-10` child escapes behind the section background whenever the nearest
// ancestor doesn't open a stacking context, which is what made the bar vanish
// on tinted surfaces when this was first built.
//
// font-black resolves to ExtraBold: the Manrope variable axis tops out at
// 800, so nothing is synthesised. That is the intended weight.

const SIZE_CLASSES = {
  sm: 'text-lg',
  md: 'text-xl',
} as const;

export function LeaderSmartWordmark({
  size = 'md',
}: {
  size?: keyof typeof SIZE_CLASSES;
}) {
  return (
    <span
      className={`font-manrope font-black tracking-tight text-[#1A1E3F] ${SIZE_CLASSES[size]}`}
    >
      Leader
      <span className="relative inline-block">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-[8%] h-[35%] rounded-[2px] bg-[#EFCB4A]"
        />
        <span className="relative">Smart</span>
      </span>
      <span className="text-[#EFCB4A]">.</span>
    </span>
  );
}
