// Display-only currency conversion. Shop prices are stored in INR and credit
// plans in USD; both are shown in the visitor's currency using these
// approximate rates (units of currency per 1 USD). Actual payments are still
// charged in the payment currency shown at checkout.
export const USD_RATES = {
  USD: 1, INR: 96.07, EUR: 0.92, GBP: 0.78, CAD: 1.37, AUD: 1.52, NZD: 1.66, AED: 3.67, SAR: 3.75, QAR: 3.64,
  KWD: 0.31, BHD: 0.377, OMR: 0.385, SGD: 1.34, MYR: 4.45, THB: 35, IDR: 16200, PHP: 57, VND: 25400,
  JPY: 150, KRW: 1380, CNY: 7.2, HKD: 7.8, TWD: 32, BDT: 120, PKR: 280, LKR: 300, NPR: 140, CHF: 0.88,
  SEK: 10.5, NOK: 10.7, DKK: 6.9, PLN: 4, TRY: 34, RUB: 92, ZAR: 18, NGN: 1500, KES: 129, EGP: 49,
  BRL: 5.5, MXN: 18, ARS: 900, CLP: 940, COP: 4100, ILS: 3.7,
};

export const CURRENCIES = Object.keys(USD_RATES);

const fmtCache = {};
const formatter = (currency, wholeUnits, locale) => {
  const key = `${locale}${currency}${wholeUnits}`;
  if (!fmtCache[key]) {
    fmtCache[key] = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      ...(wholeUnits ? { maximumFractionDigits: 0, minimumFractionDigits: 0 } : {}),
    });
  }
  return fmtCache[key];
};

const roundNice = (n) => (n >= 100 ? Math.round(n) : Math.round(n * 100) / 100);

// Formats an amount given in `from` ("INR" | "USD") in the target currency.
export const convertAndFormat = (amount, from, to, usdInr = USD_RATES.INR, locale) => {
  const n = Number(amount) || 0;
  if (from === to) return formatter(to, to === "INR" && Number.isInteger(n), locale).format(n);
  const usd = from === "USD" ? n : n / usdInr;
  const rate = to === "INR" ? usdInr : USD_RATES[to] || 1;
  const value = roundNice(usd * rate);
  return formatter(to, value >= 100, locale).format(value);
};
