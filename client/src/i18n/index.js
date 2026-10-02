import en from "./en.js";
import hi from "./hi.js";
import es from "./es.js";
import fr from "./fr.js";
import de from "./de.js";
import pt from "./pt.js";
import ar from "./ar.js";
import ja from "./ja.js";
import zh from "./zh.js";

export const DICTIONARIES = { en, hi, es, fr, de, pt, ar, ja, zh };
export const RTL_LANGS = ["ar"];

// Language spoken in each supported country. Anything not listed gets English.
const LANG_BY_COUNTRY = {
  IN: "hi",
  ES: "es", MX: "es", AR: "es", CL: "es", CO: "es",
  FR: "fr", BE: "fr",
  DE: "de", AT: "de", CH: "de",
  PT: "pt", BR: "pt",
  AE: "ar", SA: "ar", QA: "ar", KW: "ar", BH: "ar", OM: "ar", EG: "ar",
  JP: "ja",
  CN: "zh", HK: "zh", TW: "zh",
};
export const languageForCountry = (code) => LANG_BY_COUNTRY[code] || "en";

// Looks the key up in the language, then English, then returns the key.
export const translate = (lang, key, vars) => {
  let text = DICTIONARIES[lang]?.[key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, v);
  return text;
};
