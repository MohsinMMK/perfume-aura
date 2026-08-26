import type { CSSProperties } from "react";

type NavGlyphStyle = CSSProperties & {
  "--aura-nav-index": number;
};

function NavLabelFace({
  label,
  outline = false,
}: Readonly<{
  label: string;
  outline?: boolean;
}>) {
  return (
    <span
      className={`aura-nav-wave__face ${outline ? "aura-nav-wave__face--outline" : "aura-nav-wave__face--solid"}`}
    >
      {Array.from(label).map((character, index) => (
        <span
          // Repeated characters need their position to form a stable identity.
          key={`${character}-${index}`}
          className="aura-nav-wave__glyph"
          style={{ "--aura-nav-index": index } as NavGlyphStyle}
        >
          {character === " " ? "\u00a0" : character}
        </span>
      ))}
    </span>
  );
}

export function NavWaveLabel({ label }: Readonly<{ label: string }>) {
  return (
    <span aria-hidden="true" className="aura-nav-wave">
      <NavLabelFace label={label} />
      <NavLabelFace label={label} outline />
    </span>
  );
}
