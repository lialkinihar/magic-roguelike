# Мастера иконок скиллов (`raw_png`)

Сюда складываются **исходные** PNG перед импортом в игру: **500×500**, **квадрат**, формат **PNG**.

## Хромакей

Фон — **ровный** цвет **`#fc03f8`** (без градиента, без «сцены»). Этот цвет снимается при импорте (`npm run icons:import-raw`). Если на объекте остаётся ореол — подстрой **`RAW_CHROMA_TOLERANCE`** (по умолчанию 18) или поправь картинку.

## Стилистика и палитра

- **Референс по стихиям и общему тону:** соседний файл **`invoke.png`** — лёд (циан/белый), молния (жёлто-белый), огонь (оранжево-красный с золотом), аркан (неоновый фиолетовый/розовый круг). Фон на референсе уже под тот же хромакей.
- **Hex из кода UI (дополнительный ориентир):** [`assets/visuals/palette.js`](../visuals/palette.js) — `GAME.ice`, `lightning`, `fire`, `arcane` и т.д.

### Базовые руны — один стиль на тройку (`rune_q`, `rune_w`, `rune_e`)

Нужны **три иконки одной визуальной системы**: одна «линия» арта, как три варианта одного набора HUD, а не три случайных картинки.

**Что унифицировать (держать одинаковым на всех трёх):**

- **Формат знака:** один тип носителя — например круглая печать / двойное кольцо / гекс — **одинаковый масштаб** знака в кадре 500×500 (поля от края те же).
- **Линия и свечение:** одна логика — толщина штриха, сила bloom, «неон против тёмной подложки печати»; не смешивать на Q векторную тонкую линию, на W — масляную кисть.
- **Арканная обвязка:** лёгкий **фиолетово-розовый неон** как у круга в **`invoke.png`** (тонкие руны/гравюра по ободу) — **одинаковый приём** на всех трёх, чтобы читалась общая школа магии.
- **Стихия только в центре:** **Q** — лёд / кристалл / снежинка (циан, белый); **W** — молния (жёлтый, белый); **E** — пламя (оранжевый, красный, золото) — палитра как на **`invoke.png`** и в [`palette.js`](../visuals/palette.js) (`GAME.ice`, `lightning`, `fire`).
- **Читаемость 64×64:** один главный силуэт стихии внутри печати, без мелкой россыпи.

**Практика:** генерировать **три картинки в одной сессии** (или подряд с одним и тем же блоком «shared style» в промпте), потом визуально сравнить рядом на тёмном фоне; при расхождении — подправить или перегенерировать слабое звено.

#### Общий блок для промпта (English) — вставь перед описанием стихии для **каждой** из трёх рун

```text
Set of three matching fantasy game skill icons, same art style and same rune-seal frame layout for all,
consistent line weight and glow strength, thin violet-magenta arcane ring engravings like a unified magic school,
elemental motif only in the center of the seal, square 500x500, flat solid chroma background #fc03f8 only,
high-end mobile RPG icon quality, readable silhouette at 64px.
```

#### Дополнение под конкретную стихию (одна строка в конец)

| `skillId` | Строка к добавлению |
|-----------|----------------------|
| `rune_q` | `This icon: ICE element — cyan and white frost, crystal or snowflake core.` |
| `rune_w` | `This icon: LIGHTNING element — yellow and white electric bolt, sharp zigzag core.` |
| `rune_e` | `This icon: FIRE element — orange red and gold flame core, ember glow.` |

В конец любого промпта добавь техблок из [`AI_ICON_GUIDE.md`](../visuals/AI_ICON_GUIDE.md) (негатив, без текста и т.д.).

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
