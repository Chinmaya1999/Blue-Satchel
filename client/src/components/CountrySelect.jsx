import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { COUNTRIES, flagEmoji } from "../utils/countries.js";
import { useLocale } from "../context/LocaleContext.jsx";

// Navbar country picker. The chosen country sets the site's language,
// currency and number format.
const CountrySelect = () => {
  const { country, countryCode, selectCountry, currency, t } = useLocale();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(n) || c.code.toLowerCase() === n) : COUNTRIES;
  }, [q]);

  const pick = (code) => {
    selectCountry(code);
    setOpen(false);
    setQ("");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("nav.selectCountry")}
        title={t("nav.selectCountry")}
        className="flex h-9 items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 text-xs font-semibold text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10"
      >
        <span className="text-base leading-none">{flagEmoji(countryCode)}</span>
        <span className="hidden sm:inline">{currency}</span>
        <ChevronDown size={13} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute end-0 top-11 z-50 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-[#0a1020] shadow-2xl ring-1 ring-white/15">
          <p className="px-4 pt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/90">{t("nav.selectCountry")}</p>
          <div className="relative px-3 pb-2 pt-2">
            <Search size={14} className="absolute start-6 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("nav.searchCountry")}
              className="h-9 w-full rounded-full bg-white/[0.05] ps-8 pe-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-slate-500 focus:ring-cyan-300/50"
            />
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto px-1.5 pb-2">
            {list.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.code === country?.code}
                  onClick={() => pick(c.code)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-sm transition hover:bg-white/10 ${c.code === country?.code ? "bg-cyan-400/10 text-white" : "text-slate-300"}`}
                >
                  <span className="text-base leading-none">{flagEmoji(c.code)}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-[11px] text-slate-500">{c.currency}</span>
                  {c.code === country?.code && <Check size={14} className="text-cyan-300" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CountrySelect;
