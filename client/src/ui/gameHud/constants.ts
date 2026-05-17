/** Визуальные id из атласа для панели рун/invoke и списка всех комбо. */

export const MAIN_SLOT_VISUAL_IDS = ["game_skill_rune_q", "game_skill_rune_w", "game_skill_rune_e", "game_skill_invoke"] as const;



export const MAIN_KEY_LABELS = ["Q", "W", "E", "R"] as const;



export const MAIN_SLOT_LABELS = ["Ice Rune", "Lightning Rune", "Fire Rune", "Invoke"] as const;



/** Каталог лавки — общий контракт с сервером (`@magic-roguelike/shared`). */

export {

  SHOP_OFFERS,

  type ShopOfferId,

  type ShopOfferMeta,

} from "@magic-roguelike/shared";
