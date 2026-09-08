// The LeaderSmart wordmark — the product's only logo, used by both the public
// landing page and the authenticated app chrome.
//
// There is no glyph mark alongside it: "Smart" carries a yellow highlighter
// bar and the trailing period is yellow, and that is the whole identity. The
// compact single-glyph "L." variant for very tight spaces lives separately in
// src/app/_landing/app-icon.tsx.
//
// This file exists because the mark was briefly duplicated — one copy for the
// landing, one for the app — while the two surfaces carried different product
// names. They no longer do, and a logo rendered from two sources is a logo
// that drifts.
//
// The highlight is a sibling span painted *before* the text and lifted back
// with `relative` on the text itself, rather than a negative z-index. A
// `-z-10` child escapes behind the section background whenever the nearest
// ancestor doesn't open a stacking context, which made the bar vanish on the
// tinted hero and the dark footer.
//
// font-black resolves to ExtraBold: the Manrope variable axis tops out at 800,
// so nothing is synthesised. That is the intended weight.

// One scale spanning both surfaces, smallest first. The app chrome uses the
// bottom two steps and the landing the top three; `xs` and `lg` each exist for
// exactly one caller, which is why the scale looks lopsided.
const SIZE_CLASSES = {
  xs: 'text-lg',
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-4xl',
} as const;

export function Wordmark({
  size = 'md',
  tone = 'dark',
}: {
  size?: keyof typeof SIZE_CLASSES;
  /** `dark` = navy type for light surfaces; `light` = white type for the navy footer. */
  tone?: 'dark' | 'light';
}) {
  return (
    <span
      className={`font-manrope font-black tracking-tight ${SIZE_CLASSES[size]} ${
        tone === 'light' ? 'text-white' : 'text-[#1A1E3F]'
      }`}
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
