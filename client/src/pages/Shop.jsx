import { useEffect, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import api from "../api/axios.js";
import ProductCard from "../components/ProductCard.jsx";
import Loader from "../components/Loader.jsx";

const CATEGORIES = ["cleanser", "serum", "moisturizer", "sunscreen", "treatment", "toner", "mask"];
const TAGS = ["spots", "pores", "texture", "redness", "dark-circles", "hydration", "anti-aging", "acne", "brightening"];

const Shop = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const params = { limit: 24 };
    if (q) params.q = q;
    if (category) params.category = category;
    if (tag) params.tag = tag;

    api
      .get("/products", { params, signal: controller.signal })
      .then(({ data }) => setItems(data.items))
      .catch((e) => { if (e.name !== "CanceledError") console.error(e); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [q, category, tag]);

  return (
    <div className="container-app py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-slate-900">Shop Skincare</h1>
        <p className="mt-1 text-slate-500">Curated products for every skin concern.</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search products, ingredients…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button onClick={() => setShowFilters((v) => !v)} className="btn-secondary sm:w-auto">
          <SlidersHorizontal size={15} /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="card mb-8 grid gap-5 p-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Category</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCategory("")} className={`badge ${category === "" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}>All</button>
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`badge capitalize ${category === c ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Skin Concern</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setTag("")} className={`badge ${tag === "" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}>All</button>
              {TAGS.map((t) => (
                <button key={t} onClick={() => setTag(t)} className={`badge capitalize ${tag === t ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}>{t.replace("-", " ")}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Loader label="Loading products…" />
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-slate-400">No products match your filters.</div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
      )}
    </div>
  );
};

export default Shop;
