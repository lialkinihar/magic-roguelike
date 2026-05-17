import { AtlasIconMount } from "../../visuals/AtlasIconMount";
import type { ShopOfferMeta } from "./constants";

export function ShopOfferRow({
  offer,
  disabled,
  onPurchase,
}: {
  offer: ShopOfferMeta;
  disabled: boolean;
  onPurchase: () => void;
}) {
  return (
    <button
      type="button"
      className="game-hud__shopOffer"
      data-offer-id={offer.id}
      disabled={disabled}
      onClick={onPurchase}
    >
      <span className="game-hud__shopIconPlate" aria-hidden>
        <AtlasIconMount assetId={offer.visualAsset} className="visual-icon shop-item-visual" />
      </span>
      <span className="game-hud__shopTexts">
        <strong>{offer.title}</strong>
        <em>
          {offer.description}
          {offer.stockLabel ? (
            <>
              {" "}
              {offer.id === "shop-buy-aegis" ? (
                <span data-role="shop-aegis-stock">{offer.stockLabel}</span>
              ) : (
                <span>{offer.stockLabel}</span>
              )}
            </>
          ) : null}
        </em>
      </span>
      <span className="game-hud__shopPrice">
        <span>{offer.price}</span>
        <AtlasIconMount assetId="game_coin" className="visual-icon shop-inline-coin" />
      </span>
    </button>
  );
}
