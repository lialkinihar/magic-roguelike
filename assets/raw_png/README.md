# Мастера иконок скиллов (`raw_png`)

Сюда складываются **исходные** PNG перед импортом в игру: **500×500**, **квадрат**, формат **PNG**.

## Хромакей

Фон — **ровный** цвет **`#fc03f8`** (без градиента, без «сцены»). Этот цвет снимается при импорте (`npm run icons:import-raw`). Если на объекте остаётся ореол — подстрой **`RAW_CHROMA_TOLERANCE`** (по умолчанию 18) или поправь картинку.

## Стилистика и палитра

- **Референс по стихиям и общему тону:** соседний файл **`invoke.png`** — лёд (циан/белый), молния (жёлто-белый), огонь (оранжево-красный с золотом), аркан (неоновый фиолетовый/розовый круг). Фон на референсе уже под тот же хромакей.
- **Hex из кода UI (дополнительный ориентир):** [`assets/visuals/palette.js`](../visuals/palette.js) — `GAME.ice`, `lightning`, `fire`, `arcane` и т.д.

### Базовые руны (`rune_q`, `rune_w`, `rune_e`)

Композиция: **руна как знак** (глиф, круг, символ) + **узнаваемая стихия** на нём или внутри: **Q** — лёд / кристалл / снежинка; **W** — молния; **E** — пламя. Должно читаться в **64×64** после даунскейла (один главный фокус).

### Промпт-якоря (English, к блокам из `AI_ICON_GUIDE.md`)

**Ice rune (rune_q):**  
`Fantasy game skill icon, rune sigil or circular seal with clear ice motif inside — crystals or snowflake, cyan and white palette per reference, elemental frost magic`

**Lightning rune (rune_w):**  
`Fantasy game skill icon, rune sigil with lightning bolt motif, bright yellow and white electric arcs, high contrast, elemental storm magic`

**Fire rune (rune_e):**  
`Fantasy game skill icon, rune sigil with flame motif, orange red and gold ember palette, elemental fire magic`

Добавь в промпт хвост про **flat solid background #fc03f8** и общие техправила из [`AI_ICON_GUIDE.md`](../visuals/AI_ICON_GUIDE.md).

---

## Полный флоу

1. Сгенерировать или отрисовать PNG **500×500**, фон **`#fc03f8`**, стиль как выше.
2. Сохранить файл в **`assets/raw_png/`** с **любым именем** (например `frost_nova_v2.png`).
3. Открыть **`import-manifest.json`** и добавить объект:
   ```json
   { "file": "frost_nova_v2.png", "skillId": "combo_qqw", "note": "Frost Nova QQQ" }
   ```
   Поле **`skillId`** — это **`id`** из [`skills.config.js`](../../skills.config.js) (`rune_q`, `duo_qw`, `combo_eee`, …). Для печати Invoke в UI: **`invoke_seal`**. Поле **`note`** только для себя, скрипт игнорирует.
4. Выполнить:
   ```bash
   npm run icons:import-raw
   npm run icons:sprite
   ```
   Импорт пишет прозрачные PNG в **`assets/visuals/raster/skills-source/`**, спрайт собирает атлас **64×64** и обновляет карту растров.
5. Проверить игру (`npm start`) и при необходимости [`preview.html`](../visuals/preview.html).

Отдельная ручная подгонка фона без манифеста:  
`npm run icons:chroma -- --hex fc03f8 --dir …`
