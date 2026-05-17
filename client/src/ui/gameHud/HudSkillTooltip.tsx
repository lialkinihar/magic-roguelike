import type { ReactNode } from "react";

export type HudSkillTooltipProps = {
  title: string;
  lines: readonly string[];
  footer?: ReactNode;
  disabled?: boolean;
  /** Например `game-hud__tip-wrapper--block` для полноширинных тайлов. */
  wrapperClassName?: string;
  children: ReactNode;
};

/**
 * Компактный hover-тултип для кнопок панели скиллов (без новых зависимостей).
 */
export function HudSkillTooltip({ title, lines, footer, disabled, wrapperClassName, children }: HudSkillTooltipProps) {
  if (disabled) return <>{children}</>;
  const desc = `${title}${lines.filter(Boolean).length ? ` — ${lines.join(" ")}` : ""}`;
  return (
    <span
      className={wrapperClassName ? `game-hud__tip-wrapper ${wrapperClassName}` : "game-hud__tip-wrapper"}
      aria-label={desc}
    >
      {children}
      <span className="game-hud__tipPopover" role="tooltip">
        <span className="game-hud__tipTitle">{title}</span>
        {lines.map((line, i) => (
          <span key={`${title}:${i}:${line}`} className="game-hud__tipBodyLine">
            {line}
          </span>
        ))}
        {footer != null ? <span className="game-hud__tipFooter">{footer}</span> : null}
      </span>
    </span>
  );
}
