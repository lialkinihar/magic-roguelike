/** Каталог лавки: общий для клиента (HUD) и сервера (валидация покупок). */

export type ShopOfferId =
  | "shop-buy-heal"
  | "shop-buy-hp"
  | "shop-buy-speed"
  | "shop-buy-aegis"
  | "shop-buy-spellbook";

export type ShopOfferMeta = {
  id: ShopOfferId;
  visualAsset: string;
  title: string;
  description: string;
  stockLabel?: string;
  price: number;
};

export const SHOP_OFFERS: readonly ShopOfferMeta[] = [
  {
    id: "shop-buy-heal",
    visualAsset: "game_shop_heal",
    title: "Малая хил-настойка",
    description: "Восстанавливает 30 HP.",
    price: 10,
  },
  {
    id: "shop-buy-hp",
    visualAsset: "game_shop_hp",
    title: "Сердечный талисман",
    description: "+10 к максимуму HP и +10 текущего HP.",
    price: 30,
  },
  {
    id: "shop-buy-speed",
    visualAsset: "game_shop_speed",
    title: "Шаг ветра",
    description: "Увеличивает скорость передвижения на 10%.",
    price: 50,
  },
  {
    id: "shop-buy-aegis",
    visualAsset: "game_shop_aegis",
    title: "Эгида феникса",
    description:
      "Можно купить 1 раз. При смертельном уроне воскрешает с полным HP. Осталось:",
    stockLabel: "1/1",
    price: 120,
  },
  {
    id: "shop-buy-spellbook",
    visualAsset: "game_shop_spellbook",
    title: "Пустой свиток заклинаний",
    description: "Открывает +1 артефактный слот для Invoke-комбо (покупка 1 раз за забег).",
    price: 140,
  },
] as const;

const priceById: Readonly<Record<ShopOfferId, number>> = Object.freeze(
  Object.fromEntries(SHOP_OFFERS.map((o) => [o.id, o.price])) as Record<ShopOfferId, number>,
);

export function shopOfferPrice(id: string): number | undefined {
  return priceById[id as ShopOfferId];
}

export function isShopOfferId(id: string): id is ShopOfferId {
  return id in priceById;
}
