import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { usePricing } from "./PricingContext.jsx";
import { countryByCode, countryByName, guessCountryCode } from "../utils/countries.js";
import { convertAndFormat, USD_RATES } from "../utils/currency.js";
import { languageForCountry, RTL_LANGS, translate } from "../i18n/index.js";

const KEY = "bs_country";
const read = () => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};

// The visitor's country drives the site language, currency and number format.
// Priority: the country they picked in the navbar, then the country they
// signed up from, then a guess from the browser.
const LocaleContext = createContext(null);

export const LocaleProvider = ({ children }) => {
  const { user } = useAuth();
  const { pricing } = usePricing() || {};
  const [picked, setPicked] = useState(() => (countryByCode(read()) ? read() : null));

  const defaultCode = useMemo(() => {
    const loc = user?.signupLocation?.country;
    return (countryByName(loc) || countryByCode(loc))?.code || guessCountryCode();
  }, [user]);

  const countryCode = picked || defaultCode;
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
  const formatNumber = useCallback((n) => new Intl.NumberFormat(locale).format(n), [locale]);

  const value = { country, countryCode, selectCountry, lang, locale, currency, t, formatInr, formatUsd, formatNumber };
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => useContext(LocaleContext);
