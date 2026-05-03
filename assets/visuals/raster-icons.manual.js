/**
 * Ручные пути к растрам вне `raster/skills/{id}.png` (или временные, пока не переименовали).
 * Скрипт `npm run icons:raster-map` подмешивает их к карте; если для того же `visualId`
 * есть файл `raster/skills/{id}.png`, приоритет у файла в папке.
 * Иконки из атласа (`skill-icons-atlas.gen.js`) сюда не добавлять — они исключаются из карты автоматически.
 */
export const VISUAL_RASTER_MANUAL = {};
