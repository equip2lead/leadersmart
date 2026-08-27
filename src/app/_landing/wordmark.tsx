// LeaderSmart wordmark — the only logo the landing page uses. There is
// no glyph mark alongside it; "Smart" carries a yellow highlighter bar
// and the trailing period is yellow, which is the whole identity.
//
// The highlight is a sibling span painted *before* the text and lifted
// back with `relative` on the text itself, rather than a negative
// z-index. A `-z-10` child escapes behind the section background
// whenever the nearest ancestor doesn't open a stacking context, which
// made the bar vanish on the tinted hero and dark footer.

const SIZE_CLASSES = {
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
