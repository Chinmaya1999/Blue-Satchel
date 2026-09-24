import { Link } from "react-router-dom";
import { Star, ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";

const ProductCard = ({ product }) => {
  const { addItem } = useCart();

  return (
    <div className="card group flex flex-col overflow-hidden rounded-3xl transition duration-300 hover:-translate-y-1 hover:shadow-soft">
      <Link to={`/shop/${product._id}`} className="fs-product-tile relative m-2 block aspect-square overflow-hidden rounded-2xl">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {product.bestseller && (
          <span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 ring-1 ring-cyan-300/30 backdrop-blur">
            Bestseller
          </span>
        )}
        {product.compareAtPrice && (
          <span className="absolute right-3 top-3 rounded-full bg-rose-500/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_0_16px_rgba(244,63,94,0.5)]">
            Save ₹{product.compareAtPrice - product.price}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/90">{product.category}</p>
        <Link to={`/shop/${product._id}`} className="mt-0.5 line-clamp-1 font-display font-semibold text-slate-900 hover:text-brand-700">
          {product.name}
        </Link>
        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <Star size={13} className="fill-amber-400 text-amber-400" />
          <span className="font-medium text-slate-700">{product.rating}</span>
          <span>({product.reviewCount})</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-lg font-bold text-slate-900">₹{product.price}</span>
            {product.compareAtPrice && (
              <span className="text-xs text-slate-400 line-through">₹{product.compareAtPrice}</span>
            )}
          </div>
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
  );
};

export default ProductCard;
