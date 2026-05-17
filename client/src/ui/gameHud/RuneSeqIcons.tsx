import { AtlasIconMount } from "../../visuals/AtlasIconMount";

export function runeVisualForSequenceKey(ch: string): string | undefined {
  const u = ch.toUpperCase();
  if (u === "Q") return "game_combo_rune_frost";
  if (u === "W") return "game_combo_rune_lightning";
  if (u === "E") return "game_combo_rune_fire";
  if (u === "R") return "game_skill_invoke";
  return undefined;
}

export function RuneSeqIcons({ sequence }: { sequence: string }) {
  return (
    <span className="game-hud__runeSeq" aria-hidden>
      {sequence.split("").map((ch, idx) => {
        const vid = runeVisualForSequenceKey(ch);
        if (!vid) return null;
        return (
          <span key={`${sequence}-${idx}-${ch}`} className="game-hud__runeChip">
            <AtlasIconMount assetId={vid} className="rune-seq-visual visual-icon" />
          </span>
        );
      })}
    </span>
  );
}
