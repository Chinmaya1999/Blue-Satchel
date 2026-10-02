import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePricing } from "./PricingContext.jsx";
import { countryByCode } from "../utils/countries.js";
import { convertAndFormat, USD_RATES } from "../utils/currency.js";
import { languageForCountry, RTL_LANGS, translate } from "../i18n/index.js";

const KEY = "bs_country";
// Until a visitor picks a country in the navbar, the site is English / United States.
const DEFAULT_COUNTRY = "US";
const read = () => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};

// The visitor's country drives the site language, currency and number format.
const LocaleContext = createContext(null);

export const LocaleProvider = ({ children }) => {
  const { pricing } = usePricing() || {};
  const [picked, setPicked] = useState(() => (countryByCode(read()) ? read() : null));

  const countryCode = picked || DEFAULT_COUNTRY;
  const country = countryByCode(countryCode);
  const lang = languageForCountry(countryCode);
  const currency = country?.currency || "USD";
  // e.g. hi-IN, en-US — decides digit grouping (1,00,000 vs 100,000) and symbols.
  const locale = `${lang}-${countryCode}`;
  const usdInr = pricing?.payment?.usdInrRate || USD_RATES.INR;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";
  }, [lang]);

  const selectCountry = useCallback((code) => {
    setPicked(code);
    try { localStorage.setItem(KEY, code); } catch { /* storage unavailable */ }
  }, []);

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);
  // Shop prices are stored in INR, plan prices in USD.
  const formatInr = useCallback((n) => convertAndFormat(n, "INR", currency, usdInr, locale), [currency, usdInr, locale]);
  const formatUsd = useCallback((n) => convertAndFormat(n, "USD", currency, usdInr, locale), [currency, usdInr, locale]);
  // A plan's price in the viewer's currency; rupee-priced plans show their exact rupee amount in INR.
  const formatPlan = useCallback(
    (plan) => (currency === "INR" && plan.priceInr ? convertAndFormat(plan.priceInr, "INR", "INR", usdInr, locale) : formatUsd(plan.priceUsd)),
    [currency, usdInr, locale, formatUsd]
  );
  const formatNumber = useCallback((n) => new Intl.NumberFormat(locale).format(n), [locale]);

  const value = { country, countryCode, selectCountry, lang, locale, currency, t, formatInr, formatUsd, formatPlan, formatNumber };
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => useContext(LocaleContext);
