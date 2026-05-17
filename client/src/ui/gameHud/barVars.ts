import type { CSSProperties } from "react";

/** Кастомные свойства `--hp-fill` / `--armor-fill` / `--xp-fill` / `--mech-fill` для полос HUD. */
export type HudBarStyle = CSSProperties & {
  "--hp-fill"?: number;
  "--armor-fill"?: number;
  "--xp-fill"?: number;
  "--mech-fill"?: number;
};
