import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLocale } from "../context/LocaleContext.jsx";

// Language name (in its own language) and the country whose currency and
// number format go with it.
const LANGUAGES = [
  { lang: "en", label: "English", country: "US" },
  { lang: "hi", label: "हिन्दी", country: "IN" },
  { lang: "es", label: "Español", country: "ES" },
  { lang: "fr", label: "Français", country: "FR" },
  { lang: "de", label: "Deutsch", country: "DE" },
  { lang: "pt", label: "Português", country: "BR" },
  { lang: "ar", label: "العربية", country: "AE" },
  { lang: "ja", label: "日本語", country: "JP" },
  { lang: "zh", label: "中文", country: "CN" },
];

// Navbar language picker. The chosen language also sets the site's currency
// and number format (via its main country).
const CountrySelect = () => {
  const { lang, selectCountry, t } = useLocale();
  const [open, setOpen] = useState(false);
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("nav.language")}
        title={t("nav.language")}
        className="flex h-9 items-center gap-1.5 rounded-full bg-white/[0.04] px-3 text-xs font-semibold uppercase text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10"
      >
        <Globe size={14} className="text-cyan-300" />
        {lang}
        <ChevronDown size={13} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute end-0 top-11 z-50 w-56 overflow-hidden rounded-2xl bg-[#0a1020] p-1.5 shadow-2xl ring-1 ring-white/15">
          <p className="px-3 pb-1 pt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/90">{t("nav.language")}</p>
          <ul role="listbox">
            {LANGUAGES.map((l) => (
              <li key={l.lang}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l.lang === lang}
                  onClick={() => { selectCountry(l.country); setOpen(false); }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm transition hover:bg-white/10 ${l.lang === lang ? "bg-cyan-400/10 text-white" : "text-slate-300"}`}
                >
                  {l.label}
                  {l.lang === lang && <Check size={14} className="text-cyan-300" />}
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
