/**
 * Объявления для сборочного атласа иконок.
 * После добавления PNG в assets/raw_png и строки в import-manifest нужен скрипт
 * npm run icons:build-assets-atlas (из корня репо). Подробности — client/README.md.
 */
declare module "*assets-atlas.gen.js" {
  export const ASSETS_ATLAS_URL: string;
  export const ASSETS_ATLAS_WIDTH: number;
  export const ASSETS_ATLAS_HEIGHT: number;
  export const ASSETS_ATLAS_CELL: number;
  export const ASSETS_ATLAS_REGIONS: Record<string, { x: number; y: number; w: number; h: number }>;
}
