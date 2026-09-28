import { Link } from "react-router-dom";
import { Star, ShoppingBag, ExternalLink } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";

// Local illustration per category, shown if a brand's hosted image fails to load.
const FALLBACK_IMAGE = {
  cleanser: "/products/clarify-gel-cleanser.svg",
  toner: "/products/balancing-toner.svg",
  serum: "/products/niacinamide-serum.svg",
  treatment: "/products/spot-treatment.svg",
  "eye-care": "/products/caffeine-eye-serum.svg",
  moisturizer: "/products/barrier-repair-moisturizer.svg",
  sunscreen: "/products/spf50-sunscreen.svg",
  mask: "/products/clay-mask.svg",
};

export const productImageFallback = (e, category) => {
  const fallback = FALLBACK_IMAGE[category] || FALLBACK_IMAGE.serum;
  if (!e.currentTarget.src.endsWith(fallback)) e.currentTarget.src = fallback;
};

const ProductCard = ({ product, step, targets }) => {
  const { addItem } = useCart();

  return (
    <div className="card group flex flex-col overflow-hidden rounded-3xl transition duration-300 hover:-translate-y-1 hover:shadow-soft">
      <Link to={`/shop/${product._id}`} className="relative m-2 block aspect-square overflow-hidden rounded-2xl bg-white">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          onError={(e) => productImageFallback(e, product.category)}
          className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-105"
        />
        {step && (
          <span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-200 ring-1 ring-cyan-300/30 backdrop-blur">
            {step}
          </span>
        )}
        {!step && product.bestseller && (
          <span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 ring-1 ring-cyan-300/30 backdrop-blur">
            Bestseller
          </span>
        )}
        {product.compareAtPrice > product.price && (
          <span className="absolute right-3 top-3 rounded-full bg-rose-500/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_0_16px_rgba(244,63,94,0.5)]">
            Save ₹{product.compareAtPrice - product.price}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/90">
          {product.brand} · {product.category.replace("-", " ")}
        </p>
        <Link to={`/shop/${product._id}`} className="mt-0.5 line-clamp-2 font-display font-semibold text-slate-900 hover:text-brand-700">
          {product.name}
        </Link>
        {targets?.length > 0 ? (
          <p className="mt-1 line-clamp-2 text-xs text-slate-400">
            Targets <span className="font-medium text-slate-200">{targets.join(", ")}</span>
          </p>
        ) : product.reviewCount > 0 ? (
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            <span className="font-medium text-slate-700">{product.rating}</span>
            <span>({product.reviewCount})</span>
          </div>
        ) : null}
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-lg font-bold text-slate-900">₹{product.price}</span>
            {product.compareAtPrice > product.price && (
              <span className="text-xs text-slate-400 line-through">₹{product.compareAtPrice}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {product.productUrl && (
              <a
                href={product.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 ring-1 ring-white/10 transition hover:text-cyan-200 hover:ring-cyan-300/40"
                aria-label={`View ${product.name} on ${product.brand}'s site`}
                title={`View on ${product.brand}'s site`}
              >
                <ExternalLink size={15} />
              </a>
            )}
            <button
              onClick={() => addItem(product, 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/30 transition hover:bg-cyan-300 hover:text-slate-950 hover:shadow-[0_0_20px_rgba(94,231,255,0.6)] active:scale-95"
              aria-label={`Add ${product.name} to bag`}
            >
              <ShoppingBag size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
