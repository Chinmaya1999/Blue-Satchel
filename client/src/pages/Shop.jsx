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
    <div className="fs-page fs-page-bg">
    <div className="container-app py-12">
      <div className="mb-10">
        <p className="fs-eyebrow">Shop · matched to skin concerns</p>
        <h1 className="fs-page-title mt-3">Shop <span className="fs-gradient-text">skincare</span></h1>
        <p className="fs-page-sub">Curated products for every skin concern.</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-300/80" />
          <input
            className="input h-12 rounded-full pl-11"
            placeholder="Search products, ingredients…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button onClick={() => setShowFilters((v) => !v)} className="btn-secondary h-12 rounded-full px-6 sm:w-auto">
          <SlidersHorizontal size={15} /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="card mb-8 grid gap-6 rounded-3xl p-6 sm:grid-cols-2">
          <div>
            <p className="fs-eyebrow mb-3 text-[11px]">Category</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCategory("")} className={`fs-chip ${category === "" ? "fs-chip-on" : ""}`}>All</button>
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`fs-chip capitalize ${category === c ? "fs-chip-on" : ""}`}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="fs-eyebrow mb-3 text-[11px]">Skin Concern</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setTag("")} className={`fs-chip ${tag === "" ? "fs-chip-on" : ""}`}>All</button>
              {TAGS.map((t) => (
                <button key={t} onClick={() => setTag(t)} className={`fs-chip capitalize ${tag === t ? "fs-chip-on" : ""}`}>{t.replace("-", " ")}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Loader label="Loading products…" />
      ) : items.length === 0 ? (
        <div className="card rounded-3xl py-20 text-center text-slate-400">No products match your filters.</div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
      )}
    </div>
    </div>
  );
};

export default Shop;
