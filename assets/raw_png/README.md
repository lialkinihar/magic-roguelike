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
| `combo_qee` | `This icon: FROST RESONATOR — ONE beautiful large ICE CRYSTAL (cyan-white-blue, sharp facets, subtle inner glow) thrust upright INTO THE GROUND. A SMALL CIRCULAR AREA of ground around the base is ENTIRELY FROZEN — solid ice / hoarfrost pedestal, cracked glaze, no brown dirt inside that disk. On the icy floor, READABLE COLD RIPPLE WAVES spread outward from the crystal (concentric pale cyan-white frost rings or low shockwave arcs, misty edges). ICE AND COLD ONLY in frame — NO fire, NO lightning, NO characters, NO metal weapons, NO leaves, NO unrelated props, NO magic summoning circles. Flat chroma #fc03f8 only. Exactly 500x500 px. No text, no watermark.` |
| `combo_qeq` | `This icon: PROXIMITY FRAGMENTATION MINE — compact round or low puck-shaped explosive. Core is a glowing FIERY ORANGE-RED ember body (molten cracks, inner fire glow). Many SHARP ICE SHARDS and jagged crystal splinters are STUCK INTO the fire mass and protrude outward like shrapnel studs — cyan-white-blue ice at varied angles, reads as ice fragmentation mine. NO character, NO hand, NO chain lightning, NO sky meteor, NO summoning circle. Flat chroma #fc03f8 only. Exactly 500x500 px. No text, no watermark.` |
| `combo_qew` | `This icon: FIRE GROUND — a POOL / PUDDLE of LIQUID FIRE and molten lava on the ground (slight top-down or low angle). Irregular molten blob, glossy orange-red-yellow surface, darker crust rim, bright cracks. Multiple round LAVA BUBBLES on the surface — glossy blister domes, some brighter highlights as thin molten skin. Heat shimmer only over the pool. NO ice, NO lightning, NO character, NO meteor, NO summoning circle. Flat chroma #fc03f8 only. Exactly 500x500 px. No text, no watermark.` |
| `combo_qqq` | `This icon: COLD EMBRACE — PROTECTIVE ice COCOON built from SEVERAL LARGE OVERLAPPING ICE SCALES (curved crystal plates like petals or natural armor, cyan-white-blue, frost mist). Gentle outward embracing wrap — reads as DEFENSIVE magical shell / ward, NOT a prison: NO vertical bars, NO iron cage grid, NO dungeon chains, NO harsh trapped vibe. Through translucent inner ice, a VERY FAINT low-contrast SILHOUETTE of a WIZARD / MAGE (pointed hood or cloak peak, robe, vertical STAFF at the side) — same visual archetype as a classic RPG teleport mage, peaceful protected stance. NOT a feminine silhouette: NO dress shape, NO long hair, NO hourglass figure, NO bust. Soft cyan inner sanctuary glow. NO fire, NO lightning. Flat chroma #fc03f8 only. Exactly 500x500 px. No text, no watermark.` |
| `combo_qqw` | `This icon: FROST NOVA — CIRCULAR ICE AVALANCHE expanding in ALL DIRECTIONS (360° radial symmetry, top-down or slight tilt). From a tight center, OUTWARD BURST of snow powder, ice shards, and jagged crystal splinters radiates like a frozen shockwave — overlapping fronts, motion streaks outward every way, concentric frost ripples. Cyan-white-blue, reads as ring nova on the ground. NO fire, NO lightning as main read, NO character silhouette, NO floor summoning glyph. Flat chroma #fc03f8 only. Exactly 500x500 px. No text, no watermark.` |
| `combo_qwe` | `This icon: TELEPORT — ONE stylized wizard silhouette (hood, staff) on the LEFT third BREAKING APART into many small ELEMENTAL PARTICLES: ice cyan shards, lightning yellow-white sparks, fire orange embers — clear dematerialization. CENTER: visible horizontal STREAM or ARC of those mixed particles traveling toward the RIGHT. RIGHT third: the SAME silhouette visibly COALESCING from converging particles — rematerialization / arrival. Same figure implied left and right. NO magic circle on ground, NO text. Flat chroma #fc03f8 only. Exactly 500x500 px. No text, no watermark.` |
| `combo_qwq` | `This icon: ABSOLUTE ZERO — a wide FREEZING COLD CONE emanates from the LOWER-LEFT corner toward the UPPER-RIGHT of the frame: cone apex near bottom-left, opening clearly MORE than 100 degrees (~110–130°), filled with cyan-white mist, frost streaks, and freezing energy freezing everything in its path. Inside the cone: clearly VISIBLE FROZEN GRASS (icy blades) and SMALL FROZEN TREES / hoarfrost-covered bare trees (stylized, readable at 64px). In the AIR: many SMALL FLYING ICE CRYSTALS and ice shards. NO characters, NO fire, NO lightning bolts, NO magic circles, NO text. Flat chroma #fc03f8 only. Exactly 500x500 px. No watermark.` |
| `combo_qww` | `This icon: FEAR AURA — multiple EXPANDING CONCENTRIC RIPPLE RINGS of shadowy dread energy from center (deep violet, purple-black mist, faint cold cyan highlights on wave edges — frost meets nightmare). Between rings: warped smoky tendrils. Clear REALITY DISTORTION: wavy refracted bands, subtle ghost-double offset curves on wave crests (wrongness / glitch feel), slight shear on one ring — NOT literal UI text, NOT a giant skull as main subject, NOT upward lightning bolts to sky, NOT cute. Reads as waves of terror warping space. Flat chroma #fc03f8 only. Exactly 500x500 px. No text, no watermark.` |
| `combo_eee` | `This icon: COMET OF DESTRUCTION (triple-E invoke) — MASSIVE apocalyptic comet / world-killer meteor, extreme sense of threat and kinetic doom: jagged dark charred rock, enormous scale in frame, blinding plasma shock at the nose, long violent inferno tail with debris and smoke wisps, subtle heat distortion only on the comet NOT on background. NO magic summoning circle, NO rune ring, NO floor glyph, NO mandala, NO UI hoop — flat chroma #fc03f8 only behind the subject. Cinematic premium mobile RPG skill art, readable at 64px. NOT a small cute meteor, NOT ice, NOT lightning. Exactly 500x500 px output. No text, no watermark, no letterboxing.` |
| `combo_eeq` | `This icon: FLAME GUARD — circular FIRE SHIELD like a DOME WITH THE TOP CUT FLAT (truncated sphere / spherical segment): flat horizontal top opening, curved fiery walls down to a circular base ring, semi-transparent orange-red-yellow shell, NOT a closed full hemisphere bubble. Flames only at the BOTTOM around the base rim. Reads as vertical barrier wall, not a roof. NO magic summoning glyph, NO ice, NO lightning as main read. Flat chroma #fc03f8 only. Exactly 500x500 px. No text, no watermark.` |
| `combo_eew` | `This icon: MIRROR SHIELD — ONE semi-transparent BLUE-CYAN FRONTAL shield surface only (thin crescent / waning-moon plate facing the viewer, convex toward camera like a shallow lens or narrow kite-shield face). Frosted glass, icy mirror highlights, cool aqua edge glow. NOT a full sphere, NOT a bubble wrapping 360°, NOT a dome surrounding from all sides — only the visible front sheet, no back shell. NO magic circle on ground, NO fire meteor. Flat chroma #fc03f8 only. Exactly 500x500 px. No text, no watermark.` |
| `combo_eqe` | `This icon: FIRE STEP — a winding narrow FIERY FOOTPATH / ember trail on the ground (orange-red-yellow flame ribbon, scorched edges, light smoke). Clearly readable HUMAN FOOTPRINTS along the path (pairs of sole shapes glowing in the fire). NOT a giant meteor, NOT lightning bolt as main subject, NOT ice. Flat chroma #fc03f8 only. Exactly 500x500 px. No text, no watermark.` |
| `combo_eqq` | `This icon: ICE WALL — HORSESHOE / U-shaped CURVED WALL made of LARGE ICE CRYSTALS only: massive jagged crystal spires and frozen shards following a smooth arc (opening of horseshoe toward bottom or front), legs on sides, cyan-white-blue palette, sharp facets and depth overlap. NOT flat brick grid, NOT tiny snowflake icon, NOT fire, NOT lightning, NOT meteor. Flat chroma #fc03f8 only. Exactly 500x500 px. No text, no watermark.` |
| `combo_eqw` | `This icon: FIRE YO-YO — ONLY the yo-yo + thin fiery string in frame: large round fire disk, very thin flaming cord (may exit top edge). NO hand, NO arm, NO fingers, NO glove, NO body parts. NOT meteor, NOT ice, NOT chain lightning. Flat chroma #fc03f8 only. Exactly 500x500 px. No text, no watermark.` |
| `combo_ewe` | `This icon: ELEMENTAL FURY — central VORTEX visibly mixing THREE elements: fire (orange-red), ice (cyan-white frost/crystal), lightning (yellow-white zigzag) as one braided spiral core. Around it projectiles FLY OUTWARD: small FIREBALLS, ICE SHARDS, and LIGHTNING bolts in multiple directions. NO full character silhouette, NO single plain meteor. Flat chroma #fc03f8 only. Exactly 500x500 px. No text, no watermark.` |
| `combo_ewq` | `This icon: GALE FORCE — RECTANGULAR wind zone (clear rectangle or floor tile in perspective). NO leaves, NO foliage, NO organic debris. Wind is VOLUMETRIC: thick tubular gusts, layered translucent mist shells, soft 3D depth — not only thin flat speed lines. Wind fills the FULL VERTICAL HEIGHT of the zone (bottom to top), not only near the ground: vertical mist columns through the whole prism. ONE horizontal flow direction, concentrated along the FAR LONG SIDE then sweeping forward — cyan-white-aqua mist, subtle dust only. NOT fire, NOT lightning, NOT ice wall, NOT circular tornado only. Flat chroma #fc03f8 only. Exactly 500x500 px. No text, no watermark.` |
| `combo_eww` | `This icon: VOLCANO TURRET — a SMALL compact volcanic cone (triangular / low pyramid, dark cracked rock, orange-red lava glow in the crater). Multiple ROUND FIREBALLS with short flame trails launch upward and outward from the crater in different arcs — clearly fire projectiles. Light vent smoke. NOT lightning bolts, NOT ice, NOT giant sky meteor, NOT magic summoning circle on ground. Flat chroma #fc03f8 only. Exactly 500x500 px. No text, no watermark.` |
| `combo_wee` | `This icon: MIRROR CLONE — TWO stylized WIZARD silhouettes side by side (hooded cloak, vertical staff — same visual archetype as the teleport QWE mage). LEFT: SOLID opaque silhouette, reads as the REAL mage. RIGHT: same pose clearly ARTIFICIAL / summoned copy — lower opacity, faint offset ghost edge, dashed or sparkling outline, soft arcane shimmer particles (violet-cyan), subtle wireframe or scanline hint — NOT readable text, NOT a giant mirror as main subject. Same stance and scale for both. Flat chroma #fc03f8 only. Exactly 500x500 px. No text, no watermark.` |

**`duo_qq` (QQ)** — **копьё целиком изо льда** (без металлических вставок), крупнее и опаснее осколка **`rune_q` (Q)**.

**`duo_qw` (QW)** — ледяное копьё **грубое, ломаное** (сколы, шипы, трещины), не гладкий жезл; целиком лёд, молния с **обмоткой** и окклюзией. Thunderfrost Spear.

**`duo_qe` (QE)** — **метеор**, почти целиком **в льду и инее** (кора, шипы, кристаллы; камень лишь в щелях). Cryo Meteor.

**`duo_ww` (WW)** — **Chain Storm**: усиленная **цепная молния** как у **`rune_w`**, но плотнее разветвления, сильнее «шторм»; узлы смещены по высоте, ломаная траектория, **не** шаровая молния (это WE). Основной мастер в манифесте: **`duo_ww.png`**. Дополнительно могут лежать **`duo_ww_v1.png` … `duo_ww_v5.png`** — в **`import-manifest.json`** для `skillId` **`duo_ww`** укажи один файл (`duo_ww.png` или один из `v*`), затем `npm run icons:import-raw`.

**`duo_we` (WE)** — в игре **Ball Lightning** (шаровая молния): **шар** с обмоткой разрядов; по смыслу скачет между врагами и бьёт **AOE** на каждом прыжке, не «тонкая цепь» без объёма удара.

**`duo_ee` (EE)** — **Great Meteor**: тот же тип объекта, что базовый метеор **E** (`rune_e`), но **заметно крупнее** в кадре, **сильнее огненный** (корона, хвост, искры), тело с **прожилками лавы** в трещинах камня; **без круга призыва / печати на фоне** — только метеор и огонь на `#fc03f8`; не лёд, не молния, не шаровая молния.

**`combo_qee` (QEE)** — **Frost Resonator**: **ледяной кристалл**, воткнутый в землю; **полностью ледяная** «подставка» в **небольшом радиусе**; по льду **волны холода** (концентрические кольца / рябь); **только лёд и холод**, без посторонних деталей; фон **`#fc03f8`**.

**`combo_qeq` (QEQ)** — **Proximity Mine**: **осколочная мина** — **огненная основа**, **натыканная ледяными осколками**; без персонажа и лишних объектов; фон **`#fc03f8`**.

**`combo_qew` (QEW)** — **Fire Ground**: **лужа жидкого огня** / расплавленной лавы на земле; на поверхности **пузырьки лавы** (глянцевые купола); без льда и молнии; фон **`#fc03f8`**.

**`combo_qqq` (QQQ)** — **Cold Embrace**: **ледяной кокон** из **нескольких крупных ледяных чешуек**; **внутри** сквозь лёд едва виден **силуэт мага** (капюшон, посох), как в стиле иконки телепорта — **не женский** силуэт; фон **`#fc03f8`**.

**`combo_qqw` (QQW)** — **Frost Nova**: **круговая лавина** льда и снега **во все стороны** от центра (радиальный удар, кольца, осколки); без огня и молнии; фон **`#fc03f8`**.

**`combo_qwe` (QWE)** — **Teleport**: слева **силуэт волшебника распадается** на **элементальные частицы** (лёд, молния, огонь); по центру **поток частиц** к правому краю; справа частицы **собираются обратно** в тот же силуэт; фон **`#fc03f8`**.

**`combo_qwq` (QWQ)** — **Absolute Zero**: иконка — **конус холода** из **левого нижнего** в **правый верхний** угол (ширина **>100°**); **заледеневшая трава** и **деревья** на пути; в воздухе **мелкие ледяные кристаллы**; фон **`#fc03f8`**.

**`combo_qww` (QWW)** — **Fear Aura**: **волны страха** от центра (концентрические кольца, фиолетово-тёмный туман), **искажение реальности** — рябь, «двойники» фронта волны, лёгкий перекос; без черепа как главного объекта и без молнии в небо; фон **`#fc03f8`**.

**`combo_eee` (EEE)** — **Comet of Destruction**: верхний тир огня — **комета гибели**, в кадре должна **веять угрозой** (масштаб, скорость, хаос хвоста); **без магических кругов** на фоне — только тело кометы и пламя/шлейф на `#fc03f8`, **500×500**.

**`combo_eeq` (EEQ)** — **Flame Guard**: **круговой огненный щит** — как у купола **срезана верхушка** (плоское верхнее «окно», стенки дугой вниз к кольцу основания), полупрозрачный огонь; **внизу** по периметру — **пламя**; без магической печати, фон **`#fc03f8`**.

**`combo_eew` (EEW)** — **Mirror Shield**: **сине-голубой полупрозрачный щит** — только **передняя** изогнутая поверхность (узкий серп / лист стекла к врагам), **не** сфера и **не** оболочка «вокруг со всех сторон»; фон **`#fc03f8`**.

**`combo_eqe` (EQE)** — **Fire Step**: **огненная тропинка** (узкий след пламени по земле), по ней **видны человеческие следы** (подошвы); не метеор, не лёд; фон **`#fc03f8`**.

**`combo_eqq` (EQQ)** — **Ice Wall**: **подковообразная** изогнутая **стена из крупных ледяных кристаллов** (шипы, грани, лёд), без огня; фон **`#fc03f8`**.

**`combo_eqw` (EQW)** — **Fire Yo-Yo**: **только йо-йо** (огненный диск) и **тонкая огненная нить**; **без руки** и без частей тела в кадре; фон **`#fc03f8`**.

**`combo_ewe` (EWE)** — **Elemental Fury**: **вихрь из трёх стихий** (огонь, лёд, молния в одном завихрении); **вокруг** разлетаются **огненные шары**, **ледяные осколки** и **молнии**; без целого персонажа в кадре; фон **`#fc03f8`**.

**`combo_ewq` (EWQ)** — **Gale Force**: **прямоугольная зона**; **без листьев и мусора**; **объёмные** потоки (туманные «столбы», слои), ветер **на всю высоту** зоны, не только у «пола»; общий унос **в одну сторону**, усиление у **дальней** стороны; фон **`#fc03f8`**.

**`combo_eww` (EWW)** — **Volcano Turret**: **небольшой вулкан** (конус, трещины, свечение жерла); из кратера **вылетают огненные шары** с короткими шлейфами; не молния, не метеор с неба; фон **`#fc03f8`**.

**`combo_wee` (WEE)** — **Mirror Clone**: **два силуэта мага** как на телепорте (капюшон, посох); **слева** — **обычный**, плотный силуэт; **справа** — **магический двойник** (полупрозрачный, контур/«глюк», частицы), явно **искусственная** копия; фон **`#fc03f8`**.

В конец любого промпта добавь техблок из [`AI_ICON_GUIDE.md`](../visuals/AI_ICON_GUIDE.md) (негатив, без текста и т.д.).

---

## Два типа ассетов: руны Q/W/E и иконки скиллов

| Назначение | `skillId` / `visualId` | Где в UI |
|------------|-------------------------|----------|
| **Клавиши комбинации** (маленькие повторяющиеся Q/W/E в ряд) | `rune_q`, `rune_w`, `rune_e` | подписи комбо (`QQE`, `WQW`, …), тултипы, строка у кулдауна Invoke |
| **Глифы QWE в полоске комбо** (отдельный арт, не иконки скиллов) | мастера `frost_rune`, `lightning_rune`, `fire_rune` → в атласе `game_combo_rune_frost` / `_lightning` / `_fire` | UI строки комбинации; в коде см. `KEY_TO_COMBO_RUNE_VISUAL_ID` в [`icons.js`](../../icons.js) |
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
   Поле **`skillId`** — это **`id`** из [`skills.config.js`](../../skills.config.js) (`rune_q`, `duo_qw`, `combo_eee`, …) **или** один из глифов комбо: **`frost_rune`**, **`lightning_rune`**, **`fire_rune`** (мастера в `raw_png`, те же правила хромакея). Для печати Invoke в UI: **`invoke_seal`**. Поле **`note`** только для себя, скрипт игнорирует.
4. Выполнить:
   ```bash
   npm run icons:import-raw
   npm run icons:sprite
   ```
   Импорт пишет прозрачные PNG в **`assets/visuals/raster/skills-source/`**, спрайт собирает атлас **64×64** и обновляет карту растров.
5. Проверить игру (`npm start`) и при необходимости [`preview.html`](../visuals/preview.html).

Отдельная ручная подгонка фона без манифеста:  
`npm run icons:chroma -- --hex fc03f8 --dir …`
