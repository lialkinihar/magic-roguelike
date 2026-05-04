# Мастера иконок скиллов (`raw_png`)

Сюда складываются **исходные** PNG перед импортом в игру: **500×500**, **квадрат**, формат **PNG**.

**Генерация у ИИ:** в промпте **сразу** проси **exactly 500×500 pixels** (или эквивалент «canvas 500 by 500»). Не опирайся на то, что агент потом «дотянет» картинку через `sharp` — это только запасной путь, если модель выдала другой размер.

## Хромакей

Фон — **ровный** цвет **`#fc03f8`** (без градиента, без «сцены»). Этот цвет снимается при импорте (`npm run icons:import-raw`). Если на объекте остаётся ореол — подстрой **`RAW_CHROMA_TOLERANCE`** (по умолчанию 18) или поправь картинку.

## Стилистика и палитра

- **Референс по стихиям и общему тону:** соседний файл **`invoke.png`** — лёд (циан/белый), молния (жёлто-белый), огонь (оранжево-красный с золотом), аркан (неоновый фиолетовый/розовый круг). Фон на референсе уже под тот же хромакей.
- **Hex из кода UI (дополнительный ориентир):** [`assets/visuals/palette.js`](../visuals/palette.js) — `GAME.ice`, `lightning`, `fire`, `arcane` и т.д.

### Базовые руны — один стиль на тройку (`rune_q`, `rune_w`, `rune_e`)

Нужны **три иконки одной визуальной системы**: одна «линия» арта, как три варианта одного набора HUD, а не три случайных картинки. **Исключения для базовых Q, W, E:** на ровном `#fc03f8` без печати — **`rune_q`** ледяной осколок; **`rune_w`** цепная молния: узлы **не в один ряд** — слегка смещены по высоте, соединены **ломаной** зигзаг-траекторией; каждый узел — **сплетение молнии** без видимого круга; **`rune_e`** метеор (читаемость в 64×64).

**Главное правило:** **оболочка (внешняя печать) на всех трёх должна быть визуально одна и та же** — те же кольца, те же узоры по ободу, тот же контраст и толщина линий, тот же «колодец» между ободком и центром. **Меняется только маленький центральный диск** с мотивом стихии (лёд / молния / огонь). Не делай разные формы обода или разный набор рун на кольцах между Q, W и E.

**Что унифицировать (держать одинаковым на всех трёх):**

- **Оболочка целиком:** двойное (или тройное) кольцо, гравировка/руны по окружности, тёмная подложка печати — **пиксель-в-пиксель одинаковая композиция обода**; отличие только в **центральном круге** со стихией.
- **Линия и свечение:** одна логика — толщина штриха, сила bloom на кольцах; не смешивать на Q векторную тонкую линию, на W — масляную кисть.
- **Арканная обвязка:** **фиолетово-розовый неон** как у **`invoke.png`** — **идентичный** на всех трёх.
- **Центр стихии:** **Q** — **простой ледяной осколок** без обода; **W** — **цепная молния**: узлы **смещены по вертикали**, путь **ломаной** (не прямая линия); в узле молния **опутывает** точку без видимого круга; **E** — **метеор** без обода; альтернативный бриф для общей печати — см. **`invoke.png`** и [`palette.js`](../visuals/palette.js).
- **Читаемость 64×64:** один главный силуэт стихии **только** в центральном диске.

**Практика:** генерировать **три картинки в одной сессии** (или подряд с одним и тем же блоком «shared style» в промпте), потом визуально сравнить рядом на тёмном фоне; при расхождении — подправить или перегенерировать слабое звено.

#### Общий блок для промпта (English) — вставь перед описанием стихии для **каждой** из трёх рун

```text
Trio of fantasy RPG skill icons — output image EXACTLY 500 by 500 pixels (500x500 square canvas), same art style. CRITICAL: the OUTER magical seal wrapper must be
IDENTICAL on all three images — same twin concentric rings, same carved arcane glyphs on the rings in
violet-magenta neon, same dark bezel between rings and center, same line weight and bloom on the rings.
ONLY the small INNER circular focal area changes per icon. Flat solid chroma background #fc03f8 only,
high-end mobile HUD, readable at 64px, no text, no watermark.
```

#### Дополнение под конкретную стихию (одна строка в конец)

| `skillId` | Строка к добавлению |
|-----------|----------------------|
| `rune_q` | `This icon: plain ice shard / frost splinter only — cyan and white crystal, elongated jagged silhouette, no frame, no magic rings, minimal mist, no extra VFX.` |
| `rune_w` | `This icon: chain lightning — nodes staggered (not collinear), shallow zigzag or S path; jagged bolts at angles between nodes; each node a tight lightning cocoon, NO visible circle; yellow-white, no frame, no extra VFX.` |
| `rune_e` | `This icon: plain ordinary meteor only — gray rocky body, small orange-yellow trail, no frame, no magic rings, no extra VFX.` |
| `duo_qq` | `This icon: large ice spear — ENTIRE weapon solid ice crystal only (head + shaft one frozen piece); NO metal rings, ferrule, steel, iron, bronze, or leather; secondary spikes also ice; bigger than basic ice shard; cyan/white/blue ice shadows; diagonal thrust; no frame, no extra VFX.` |
| `duo_qw` | `This icon: rough brutal frost spear — NOT smooth wand or polished hex rod: jagged chipped facets, irregular splinters and side spikes on shaft, deep cracks, coarse glacier ice texture, asymmetric weapon silhouette. Still 100% ice, NO metal. Lightning wraps in 3D with occlusion (in front / behind ice), spiral, NOT flat overlay. Yellow-white. Chroma #fc03f8 only; no frame, no text.` |
| `duo_qe` | `This icon: METEOR fully COVERED in ICE — dark rock core mostly hidden under thick white-blue frost crust, jagged ice plates and icicles on surface, cyan crystal highlights, frozen comet; dominant frost, NO bare flaming meteor, NO lightning, NO spear. Trail mostly ice shards / cold vapor. Chroma #fc03f8 only; no frame, no text.` |
| `duo_ww` | `This icon: CHAIN STORM — upgraded chain lightning (stronger than basic W): MORE branches, thicker main bolts, higher energy. Nodes staggered vertically (NOT collinear), zigzag or S path between nodes; each node a dense lightning cocoon, NO visible hollow circle, NOT a single plasma sphere (that is WE). Yellow-white / cyan-white electric. NO summoning circle on background, NO ice, NO meteor. Chroma #fc03f8 only; no frame, no text.` |
| `duo_we` | `This icon: BALL LIGHTNING — glowing plasma sphere (violet-cyan-white core) as ONE cohesive ball, NOT a jagged bolt chain alone. Electric arcs wrap the sphere (in front / behind with occlusion). Reads as a hopping AOE orb skill, not thin chain lightning between dots. Chroma #fc03f8 only; no frame, no text, no ice spear.` |
| `duo_ee` | `This icon: GREAT METEOR — same subject as basic E (single meteor) but the rocky core is CLEARLY LARGER in frame than rune_e meteor (~15–25% bigger silhouette), heavier mass. Much MORE FIRE: vivid orange-red-yellow corona, brighter tail, ember particles. Dark rock cracked open with GLOWING LAVA VEINS (branching molten streaks through the body, not just a smooth surface). NO summoning circle, magic ring, sigil, mandala, or arcane disk on the background — only the meteor + flames/trail on flat chroma. NOT ice, NOT lightning chain, NOT ball lightning. Chroma #fc03f8 only; no frame, no text.` |
| `combo_eee` | `This icon: COMET OF DESTRUCTION (triple-E invoke) — MASSIVE apocalyptic comet / world-killer meteor, extreme sense of threat and kinetic doom: jagged dark charred rock, enormous scale in frame, blinding plasma shock at the nose, long violent inferno tail with debris and smoke wisps, subtle heat distortion only on the comet NOT on background. NO magic summoning circle, NO rune ring, NO floor glyph, NO mandala, NO UI hoop — flat chroma #fc03f8 only behind the subject. Cinematic premium mobile RPG skill art, readable at 64px. NOT a small cute meteor, NOT ice, NOT lightning. Exactly 500x500 px output. No text, no watermark, no letterboxing.` |
| `combo_eeq` | `This icon: FLAME GUARD — circular FIRE SHIELD like a DOME WITH THE TOP CUT FLAT (truncated sphere / spherical segment): flat horizontal top opening, curved fiery walls down to a circular base ring, semi-transparent orange-red-yellow shell, NOT a closed full hemisphere bubble. Flames only at the BOTTOM around the base rim. Reads as vertical barrier wall, not a roof. NO magic summoning glyph, NO ice, NO lightning as main read. Flat chroma #fc03f8 only. Exactly 500x500 px. No text, no watermark.` |

**`duo_qq` (QQ)** — **копьё целиком изо льда** (без металлических вставок), крупнее и опаснее осколка **`rune_q` (Q)**.

**`duo_qw` (QW)** — ледяное копьё **грубое, ломаное** (сколы, шипы, трещины), не гладкий жезл; целиком лёд, молния с **обмоткой** и окклюзией. Thunderfrost Spear.

**`duo_qe` (QE)** — **метеор**, почти целиком **в льду и инее** (кора, шипы, кристаллы; камень лишь в щелях). Cryo Meteor.

**`duo_ww` (WW)** — **Chain Storm**: усиленная **цепная молния** как у **`rune_w`**, но плотнее разветвления, сильнее «шторм»; узлы смещены по высоте, ломаная траектория, **не** шаровая молния (это WE). Основной мастер в манифесте: **`duo_ww.png`**. Дополнительно могут лежать **`duo_ww_v1.png` … `duo_ww_v5.png`** — в **`import-manifest.json`** для `skillId` **`duo_ww`** укажи один файл (`duo_ww.png` или один из `v*`), затем `npm run icons:import-raw`.

**`duo_we` (WE)** — в игре **Ball Lightning** (шаровая молния): **шар** с обмоткой разрядов; по смыслу скачет между врагами и бьёт **AOE** на каждом прыжке, не «тонкая цепь» без объёма удара.

**`duo_ee` (EE)** — **Great Meteor**: тот же тип объекта, что базовый метеор **E** (`rune_e`), но **заметно крупнее** в кадре, **сильнее огненный** (корона, хвост, искры), тело с **прожилками лавы** в трещинах камня; **без круга призыва / печати на фоне** — только метеор и огонь на `#fc03f8`; не лёд, не молния, не шаровая молния.

**`combo_eee` (EEE)** — **Comet of Destruction**: верхний тир огня — **комета гибели**, в кадре должна **веять угрозой** (масштаб, скорость, хаос хвоста); **без магических кругов** на фоне — только тело кометы и пламя/шлейф на `#fc03f8`, **500×500**.

**`combo_eeq` (EEQ)** — **Flame Guard**: **круговой огненный щит** — как у купола **срезана верхушка** (плоское верхнее «окно», стенки дугой вниз к кольцу основания), полупрозрачный огонь; **внизу** по периметру — **пламя**; без магической печати, фон **`#fc03f8`**.

В конец любого промпта добавь техблок из [`AI_ICON_GUIDE.md`](../visuals/AI_ICON_GUIDE.md) (негатив, без текста и т.д.).

---

## Два типа ассетов: руны Q/W/E и иконки скиллов

| Назначение | `skillId` / `visualId` | Где в UI |
|------------|-------------------------|----------|
| **Клавиши комбинации** (маленькие повторяющиеся Q/W/E в ряд) | `rune_q`, `rune_w`, `rune_e` | подписи комбо (`QQE`, `WQW`, …), тултипы, строка у кулдауна Invoke |
| **Иконка самого скилла** (большая плитка, слот, превью) | `duo_*`, `combo_*`, `invoke_seal` | плитка комбо, артефакты, большой слот навыка |

Три руны **уже зафиксированы** как единый стиль оболочки + разный центр; дальше генерируй **`duo_qq` … `duo_ee`** и **`combo_qqq` … `combo_eee`** (и при необходимости **`invoke_seal`**) — это **отдельные** картинки: цельная иллюстрация умения в кадре 500×500, та же палитра **`invoke.png`** и хромакей **`#fc03f8`**, читаемость **в 64×64** как иконка навыка, а не как узкая «клавиша».

Список всех `id` для манифеста — в [`skills.config.js`](../../skills.config.js) (`singleRuneCombos`, `dualRuneCombos`, `invokeCombos`).

---

## Полный флоу

1. Сгенерировать или отрисовать PNG с фоном **`#fc03f8`**, стиль как выше; у генератора в промпте — **ровно 500×500 px** выход. Если пришёл другой квадратный размер — один раз привести к 500×500 (даунскейл или пад цветом `#fc03f8`), не считать это нормой по умолчанию.
2. Сохранить файл в **`assets/raw_png/`** с **любым именем** (например `frost_nova_v2.png`).
3. Открыть **`import-manifest.json`** и добавить объект:
   ```json
   { "file": "frost_nova_v2.png", "skillId": "combo_qqw", "note": "Frost Nova QQW" }
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
