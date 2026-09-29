import { useEffect, useState } from "react";
import { Store, Loader2 } from "lucide-react";
import api from "../../api/axios.js";
import { useSiteSettings } from "../../context/SiteSettingsContext.jsx";

// Admin switch between a catalog-only shop (browse + product details only)
// and a live shop (bag, checkout with Razorpay / COD, orders).
const ShopSalesToggle = () => {
  const { refreshSettings } = useSiteSettings();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/settings").then(({ data }) => setSettings(data.settings)).catch(() => setError("Couldn't load the shop setting."));
  }, []);

  const setLive = async (shopEnabled) => {
    const msg = shopEnabled
      ? "Turn shop sales ON? Customers will be able to add products to their bag, check out and pay (Razorpay / Cash on Delivery)."
      : "Turn shop sales OFF? Products stay visible with full details, but nobody can buy — the bag, checkout and orders pages disappear for customers.";
    if (!window.confirm(msg)) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await api.patch("/admin/settings", { shopEnabled });
      setSettings(data.settings);
      refreshSettings();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save the change.");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="card p-5 text-sm text-slate-400">{error || "Loading shop setting…"}</div>;

  const live = settings.shopEnabled;
  return (
    <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${live ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
          <Store size={18} />
        </span>
        <div>
          <h2 className="font-display font-semibold text-slate-900">
            Shop is {live ? <span className="text-emerald-600">live — selling</span> : <span className="text-slate-600">catalog only</span>}
          </h2>
          <p className="text-sm text-slate-500">
            {live
              ? "Customers can add to bag, check out (Razorpay or Cash on Delivery) and see their orders."
              : "Customers can browse products and view full details, but can't buy. No bag, checkout or order pages."}
          </p>
          {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>
      </div>
      <div className="flex rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Shop sales">
        {[
          { value: false, label: "Catalog only" },
          { value: true, label: "Live — selling" },
        ].map((opt) => (
          <button
            key={opt.label}
            role="radio"
            aria-checked={live === opt.value}
            disabled={saving || live === opt.value}
            onClick={() => setLive(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              live === opt.value
                ? opt.value
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            {saving && live !== opt.value && <Loader2 size={13} className="animate-spin" />}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ShopSalesToggle;
