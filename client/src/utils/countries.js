// [ISO code, name, dial code, currency]. Used for the phone-number country
// picker at sign-up and to pick a display currency for prices.
const RAW = [
  ["IN", "India", "91", "INR"], ["US", "United States", "1", "USD"], ["CA", "Canada", "1", "CAD"],
  ["GB", "United Kingdom", "44", "GBP"], ["AU", "Australia", "61", "AUD"], ["NZ", "New Zealand", "64", "NZD"],
  ["AE", "United Arab Emirates", "971", "AED"], ["SA", "Saudi Arabia", "966", "SAR"], ["QA", "Qatar", "974", "QAR"],
  ["KW", "Kuwait", "965", "KWD"], ["BH", "Bahrain", "973", "BHD"], ["OM", "Oman", "968", "OMR"],
  ["SG", "Singapore", "65", "SGD"], ["MY", "Malaysia", "60", "MYR"], ["TH", "Thailand", "66", "THB"],
  ["ID", "Indonesia", "62", "IDR"], ["PH", "Philippines", "63", "PHP"], ["VN", "Vietnam", "84", "VND"],
  ["JP", "Japan", "81", "JPY"], ["KR", "South Korea", "82", "KRW"], ["CN", "China", "86", "CNY"],
  ["HK", "Hong Kong", "852", "HKD"], ["TW", "Taiwan", "886", "TWD"], ["BD", "Bangladesh", "880", "BDT"],
  ["PK", "Pakistan", "92", "PKR"], ["LK", "Sri Lanka", "94", "LKR"], ["NP", "Nepal", "977", "NPR"],
  ["DE", "Germany", "49", "EUR"], ["FR", "France", "33", "EUR"], ["IT", "Italy", "39", "EUR"],
  ["ES", "Spain", "34", "EUR"], ["NL", "Netherlands", "31", "EUR"], ["BE", "Belgium", "32", "EUR"],
  ["IE", "Ireland", "353", "EUR"], ["PT", "Portugal", "351", "EUR"], ["AT", "Austria", "43", "EUR"],
  ["FI", "Finland", "358", "EUR"], ["GR", "Greece", "30", "EUR"], ["CH", "Switzerland", "41", "CHF"],
  ["SE", "Sweden", "46", "SEK"], ["NO", "Norway", "47", "NOK"], ["DK", "Denmark", "45", "DKK"],
  ["PL", "Poland", "48", "PLN"], ["TR", "Turkey", "90", "TRY"], ["RU", "Russia", "7", "RUB"],
  ["ZA", "South Africa", "27", "ZAR"], ["NG", "Nigeria", "234", "NGN"], ["KE", "Kenya", "254", "KES"],
  ["EG", "Egypt", "20", "EGP"], ["BR", "Brazil", "55", "BRL"], ["MX", "Mexico", "52", "MXN"],
  ["AR", "Argentina", "54", "ARS"], ["CL", "Chile", "56", "CLP"], ["CO", "Colombia", "57", "COP"],
  ["IL", "Israel", "972", "ILS"],
];

export const COUNTRIES = RAW.map(([code, name, dial, currency]) => ({ code, name, dial, currency })).sort(
  (a, b) => a.name.localeCompare(b.name)
);

export const countryByCode = (code) => COUNTRIES.find((c) => c.code === code);

const ALIASES = { "united states of america": "US", usa: "US", uk: "GB", "great britain": "GB", england: "GB", korea: "KR", "republic of korea": "KR", uae: "AE", "türkiye": "TR", "russian federation": "RU", "viet nam": "VN" };

export const countryByName = (name) => {
  const n = (name || "").trim().toLowerCase();
  if (!n) return undefined;
  return COUNTRIES.find((c) => c.name.toLowerCase() === n) || countryByCode(ALIASES[n]);
};

// 🇮🇳 from "IN" (regional-indicator letters).
export const flagEmoji = (code) =>
  String.fromCodePoint(...[...code.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));

// Best guess at the visitor's country from the browser language (en-GB → GB)
// or, failing that, a few well-known timezones.
export const guessCountryCode = () => {
  const region = (navigator.languages || [navigator.language]).map((l) => /-([A-Za-z]{2})\b/.exec(l || "")?.[1]).find(Boolean);
  if (region && countryByCode(region.toUpperCase())) return region.toUpperCase();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  if (tz.startsWith("Asia/Kolkata") || tz.startsWith("Asia/Calcutta")) return "IN";
  return "IN";
};
