import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, ShoppingBag, ShieldCheck, Truck, ChevronLeft, Minus, Plus } from "lucide-react";
import api from "../api/axios.js";
import Loader from "../components/Loader.jsx";
import { useCart } from "../context/CartContext.jsx";

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    setLoading(true);
    api
      .get(`/products/${id}`)
      .then(({ data }) => setProduct(data.product))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="fs-page fs-page-bg"><Loader full label="Loading product…" /></div>;
  if (!product) return <div className="fs-page fs-page-bg"><div className="container-app py-20 text-center text-slate-400">Product not found.</div></div>;

  return (
    <div className="fs-page fs-page-bg">
    <div className="container-app py-10">
      <Link to="/shop" className="mb-8 inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-3.5 py-1.5 text-sm font-medium text-slate-300 ring-1 ring-white/10 transition hover:text-white">
        <ChevronLeft size={15} /> Back to shop
      </Link>

      <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
        <div className="fs-product-tile relative aspect-square overflow-hidden rounded-[2rem] ring-1 ring-white/10 shadow-[0_40px_120px_-40px_rgba(56,189,248,0.45)]">
          <div className="fs-corners absolute inset-5 z-10 opacity-70" />
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        </div>

        <div>
          <p className="fs-eyebrow">{product.category}</p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{product.name}</h1>
          <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
            <Star size={15} className="fill-amber-400 text-amber-400" />
            <span className="font-semibold text-slate-700">{product.rating}</span>
            <span>({product.reviewCount} reviews)</span>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="fs-gradient-text font-display text-4xl font-bold">₹{product.price}</span>
            {product.compareAtPrice && <span className="text-base text-slate-400 line-through">₹{product.compareAtPrice}</span>}
          </div>

          <p className="mt-5 leading-relaxed text-slate-600">{product.description}</p>

          {product.tags?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.tags.map((t) => (
                <span key={t} className="fs-chip capitalize">{t.replace("-", " ")}</span>
              ))}
            </div>
          )}

          {product.ingredients?.length > 0 && (
            <div className="card mt-6 rounded-2xl p-4">
              <p className="fs-eyebrow text-[11px]">Key ingredients</p>
              <p className="mt-2 text-sm text-slate-300">{product.ingredients.join(" · ")}</p>
            </div>
          )}

          <div className="mt-7 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-slate-200 bg-white">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-slate-50">
                <Minus size={14} />
              </button>
              <span className="w-8 text-center font-semibold text-white">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-slate-50">
                <Plus size={14} />
              </button>
            </div>
            <button
              onClick={() => { addItem(product, qty); setAdded(true); setTimeout(() => setAdded(false), 1800); }}
              className="btn-primary h-12 flex-1 rounded-full"
              disabled={product.stock === 0}
            >
              <ShoppingBag size={16} /> {product.stock === 0 ? "Out of stock" : added ? "Added to bag ✓" : "Add to bag"}
            </button>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
            <div className="flex items-center gap-2 text-sm text-slate-500"><Truck size={16} className="text-brand-500" /> Free shipping over ₹999</div>
            <div className="flex items-center gap-2 text-sm text-slate-500"><ShieldCheck size={16} className="text-brand-500" /> Secure checkout</div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default ProductDetail;
