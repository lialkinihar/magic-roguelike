# Как просить у ИИ картинки, которые реально можно ставить в интерфейс

Речь только про **промпт и постобработку**, не про игру или код.

---

## Чего добиться

Нужен файл, где **за пределами иконки прозрачность**, а по краю огня/дыма/неона — **мягкий переход в прозрачный**, без серого квадрата и без вшитой «шахматки».

ИИ **редко** выдаёт честный PNG с альфой. Надёжнее проектировать под **один из двух сценариев**.

---

## Сценарий A: хромакей (самый предсказуемый для ИИ)

**Идея:** фон — один ровный цвет, которого **нет** на самой иконке. Потом этот цвет убирается в любом редакторе или онлайн-сервисе за секунды.

**Что писать в промпте (хвост):**

```text
Solid flat background only: uniform chroma green #00FF00, no gradient on backdrop,
no environmental lighting on the background. Subject centered, no green spill on the main shapes.
Single game skill icon, square composition, isolated subject.
```

Если иконка зелёная — замени на **magenta #FF00FF** или **ярко-синий #0000FF** и то же правило: ровный фон, без градиента.

**После генерации:** удалить фон по цвету (Photopea, Photoshop, Remove.bg часто справляется и с «неидеальным» зелёном) → сохранить **PNG с прозрачностью** → при необходимости подправить кромку вручную.

В репозитории: **`npm run icons:chroma -- --hex fc03f8 --dir assets/visuals/raster/skills-source`** — все PNG в папке: пиксели близкие к `#fc03f8` станут прозрачными (параметр **`--tolerance`** в единицах RGB-расстояния, по умолчанию 18). Один файл: `npm run icons:chroma -- --hex fc03f8 path/to/icon.png --out path/out.png` (без `--out` и без `--dir` запишет рядом `*.chroma.png`).

---

## Сценарий B: «прозрачный фон» в промпте

Имеет смысл **дополнять**, а не заменять сценарий A:

```text
True transparency, alpha channel: empty areas fully transparent, no checkerboard pattern,
no gray or white backdrop behind the icon, soft semi-transparent edges on glow and smoke only.
```

Если на выходе всё равно серый квадрат — переходи на **сценарий A** для следующих итераций.

---

## Что всегда добавлять (техника под UI)

Один блок, не меняешь от иконки к иконке:

```text
Square 1:1, one centered emblem, readable silhouette at small size (game HUD icon),
high detail render, soft outer glow only on the magical effects, no text, no watermark, no frame.
```

**Негатив (если есть поле):**

```text
checkerboard, transparency grid, tiled background, subtitle, logo, multiple icons, blurry subject,
heavy jpeg compression
```

---

## Размер

Проси **квадрат** и **большой мастер** (например **500×500** или 1024×1024), потом **уменьшаешь до нужного** с тем же PNG и альфой. Мелкую картинку не стоит растягивать.

---

## Пайплайн проекта: `assets/raw_png`

Для скиллов игры зафиксирован фон-хромакей **`#fc03f8`**. Мастера клади в **`assets/raw_png/`**, связь файл → скилл — в **`assets/raw_png/import-manifest.json`** (`file` + `skillId` из `skills.config.js`). Затем:

```bash
npm run icons:import-raw
npm run icons:sprite
```

Подробности, палитра по **`invoke.png`** и промпт-якоря для **трёх базовых рун** — в [`assets/raw_png/README.md`](../raw_png/README.md).

---

## Быстрая проверка «пригодно / нет»

1. Открыть PNG на **чёрном** и на **белом** фоне в просмотрщике или редакторе. Если виден **один и тот же серый прямоугольник** — фон не прозрачный, нужна доработка.
2. Если видна **шахматка** — это не прозрачность, это артефакт; перегенерировать или вырезать фон.
3. Уменьшить превью до **64×64** глазами: силуэт должен читаться.

---

## Итог в одном предложении

**Не полагайся на слово «transparent» от ИИ:** либо добивайся **ровного chroma-фона + удаление фона**, либо ручной/сервисный **маттинг** после генерации — так картинки стабильно становятся пригодными для UI.
