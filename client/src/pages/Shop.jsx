import { useEffect, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import api from "../api/axios.js";
import ProductCard from "../components/ProductCard.jsx";
import Loader from "../components/Loader.jsx";
import { useLocale } from "../context/LocaleContext.jsx";

const CATEGORIES = ["cleanser", "toner", "serum", "treatment", "eye-care", "moisturizer", "sunscreen"];
const TAGS = [
  "acne", "pores", "oiliness", "spots", "texture", "redness", "hydration",
  "brightening", "wrinkles", "firmness", "dark-circles", "eye-bags",
];

const Shop = () => {
  const { t } = useLocale();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [brand, setBrand] = useState("");
  const [brands, setBrands] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    api.get("/products/brands").then(({ data }) => setBrands(data.brands)).catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    // DXB Beauty's own products first, then the catalogue in routine order
    // (oldest first: cleanser → sunscreen).
    const params = { limit: 100, sort: "-featured _id" };
    if (q) params.q = q;
    if (category) params.category = category;
    if (tag) params.tag = tag;
    if (brand) params.brand = brand;

    api
      .get("/products", { params, signal: controller.signal })
      .then(({ data }) => setItems(data.items))
      .catch((e) => { if (e.name !== "CanceledError") console.error(e); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [q, category, tag, brand]);

  return (
    <div className="fs-page fs-page-bg">
    <div className="container-app py-12">
      <div className="mb-10">
        <p className="fs-eyebrow">{t("shop.eyebrow")}</p>
        <h1 className="fs-page-title mt-3">{t("shop.title1")} <span className="fs-gradient-text">{t("shop.title2")}</span></h1>
        <p className="fs-page-sub">
          {brands.length > 0 ? t("shop.brands", { n: brands.length }) : t("shop.brandsFallback")}{t("shop.sub")}
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-300/80" />
          <input
            className="input h-12 rounded-full pl-11"
            placeholder={t("shop.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button onClick={() => setShowFilters((v) => !v)} className="btn-secondary h-12 rounded-full px-6 sm:w-auto">
          <SlidersHorizontal size={15} /> {t("shop.filters")}
        </button>
      </div>

      {showFilters && (
        <div className="card mb-8 grid gap-6 rounded-3xl p-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="fs-eyebrow mb-3 text-[11px]">{t("shop.category")}</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCategory("")} className={`fs-chip ${category === "" ? "fs-chip-on" : ""}`}>{t("shop.all")}</button>
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`fs-chip ${category === c ? "fs-chip-on" : ""}`}>{t(`cat.${c}`)}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="fs-eyebrow mb-3 text-[11px]">{t("shop.concern")}</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setTag("")} className={`fs-chip ${tag === "" ? "fs-chip-on" : ""}`}>{t("shop.all")}</button>
              {TAGS.map((g) => (
                <button key={g} onClick={() => setTag(g)} className={`fs-chip ${tag === g ? "fs-chip-on" : ""}`}>{t(`tag.${g}`)}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="fs-eyebrow mb-3 text-[11px]">{t("shop.brand")}</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setBrand("")} className={`fs-chip ${brand === "" ? "fs-chip-on" : ""}`}>{t("shop.all")}</button>
              {brands.map((b) => (
                <button key={b} onClick={() => setBrand(b)} className={`fs-chip ${brand === b ? "fs-chip-on" : ""}`}>{b}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Loader label={t("shop.loading")} />
      ) : items.length === 0 ? (
        <div className="card rounded-3xl py-20 text-center text-slate-400">{t("shop.empty")}</div>
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
