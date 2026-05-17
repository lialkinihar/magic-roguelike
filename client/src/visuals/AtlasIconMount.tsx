import "./atlasIcon.css";

import { memo, useLayoutEffect, useRef } from "react";

import { clearHudIconHost, mountHudAtlasIcon } from "./atlasIconDom";

export type AtlasIconMountProps = {
  assetId: string | null | undefined;
  /** Классы на корневом узле спрайта / img / fallback (часто `visual-icon …`). */
  className?: string;
};

function splitClasses(className: string | undefined): string[] {
  return className
    ?.split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean) ?? [];
}

/**
 * Обёртка над DOM-монтажом иконки (атлас + импортированные svg + текст).
 * Хост `display:contents` — иконка ведёт себя как прямой ребёнок flex/grid контейнера.
 */
export const AtlasIconMount = memo(function AtlasIconMount({ assetId, className }: AtlasIconMountProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return undefined;
    clearHudIconHost(host);
    const id = assetId?.trim();
    if (!id) return () => clearHudIconHost(host);
    const extra = splitClasses(className).filter((c) => c !== "visual-icon");
    mountHudAtlasIcon(host, id, ["visual-icon", ...extra]);
    return () => clearHudIconHost(host);
  }, [assetId, className]);

  return <span ref={ref} style={{ display: "contents" }} />;
});
