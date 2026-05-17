/** Подсказки HUD, не привязанные к id скилла в `skills.config.js`. */

export const HUD_SKILL_TOOLTIPS: Readonly<Record<string, string>> = Object.freeze({
  RUNE_TOOLTIP_Q: "Руна Q (лед). Добавляет сегмент в очередь из трёх рун перед Invoke.",
  RUNE_TOOLTIP_W: "Руна W (молния). Добавляет сегмент в очередь из трёх рун перед Invoke.",
  RUNE_TOOLTIP_E: "Руна E (огонь). Добавляет сегмент в очередь из трёх рун перед Invoke.",
  INVOKE_TOOLTIP_R:
    "Формирует заклинание только когда в очереди ровно три руна; состав переносится в слот Пробел, очередь опустошается. Неполная очередь игнорируется.",
  COMBOS_PANEL_TOOLTIP: "Открыть справочник комбинаций трёх рун.",
});
