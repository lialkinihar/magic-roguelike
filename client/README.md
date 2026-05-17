# `client/` — канонический игровой клиент (Vite + React + TS + Three)

Целевой интерфейс и сцена живут **только здесь** (см. правило в `.cursor/rules/ui-canonical-client.mdc`).

## Запуск и сборка

Из **корня** монорепозитория:

- `npm run dev` — игровой сервер WebSocket + этот Vite-клиент.
- `npm run build` — цепочка `shared` → `server` → `client` (см. корневой `package.json`).

Переменные окружения: `client/.env.local` (например `VITE_WS_URL`).

## Пайплайн PNG → атлас → потребление на клиенте (этап 5b плана)

Единая цепочка арта иконок/спрайтов HUD:

1. **Мастера** кладём в `assets/raw_png/` репозитория (корень монорепо, не только `client/`).
2. Регистрируем **`assetId`** и путь импорта в `assets/import-manifest.js` (`registerIconPng`).
3. Собираем атлас из **корня** репо: `npm run icons:build-assets-atlas` (или `npm run icons:build-assets-atlas:no-chroma`). Появляются/обновляются сгенерированные **`assets/visuals/generated/assets-atlas.gen.js`** (регионы UV) и растр атласа, импорт в конфиге Vite уже настроен.
4. На клиенте иконки HUD монтируются через **`AtlasIconMount`** + классы **`visual-icon--…`** из `src/visuals/atlasIcon.css`; новые `assetId` при необходимости отражать в описании регионов через типы (**`src/types/atlas-assets.d.ts`** ссылается на `*assets-atlas.gen.js`).

Качество именования и ограничения экспорта — в **`.cursor/rules/raw-png-asset-generation.mdc`**. Поле боя использует только **идентификаторы из snapshot** (`shared`): картинки не импортируются из `shared/`.
