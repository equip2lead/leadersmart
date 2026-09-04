// Compact "L." mark — the wordmark collapsed to a single glyph for
// places too tight to spell out Equip2Lead Coach (mobile header, anywhere
// the favicon's shape needs echoing in the page itself). Same colours
// as src/app/favicon.ico and src/app/apple-icon.png.

export function AppIcon() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1A1E3F]">
      <span className="font-manrope text-lg font-black tracking-tight text-[#EFCB4A]">
        L<span className="text-white">.</span>
      </span>
    </div>
  );
}
