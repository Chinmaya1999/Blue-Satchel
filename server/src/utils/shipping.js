// Shipping and tax rules by destination country. Shop prices and charges are
// in INR (DXB BEAUTY ships from India), so every amount here is in rupees.
//
// These are starting defaults — confirm them with your carrier and accountant
// before selling abroad. Exports of goods from India are zero-rated for GST;
// the customer may owe import duty/VAT in their own country on delivery.

const ASIA_MIDDLE_EAST = [
  "united arab emirates", "saudi arabia", "qatar", "kuwait", "bahrain", "oman", "singapore", "malaysia", "thailand",
  "indonesia", "philippines", "vietnam", "japan", "south korea", "china", "hong kong", "taiwan", "bangladesh",
  "pakistan", "sri lanka", "nepal", "israel", "turkey",
];

const DOMESTIC = { zone: "domestic", country: "India", shippingFee: 49, freeOver: 999, taxRate: 0.18, taxLabel: "GST (18%)", cod: true };
const NEARBY = { zone: "asia-middle-east", shippingFee: 799, freeOver: 7999, taxRate: 0, taxLabel: "GST (export, 0%)", cod: false };
const WORLD = { zone: "world", shippingFee: 1499, freeOver: 12999, taxRate: 0, taxLabel: "GST (export, 0%)", cod: false };

export const shippingRulesFor = (countryName) => {
  const n = String(countryName || "").trim().toLowerCase();
  if (!n || n === "india" || n === "in") return DOMESTIC;
  return { ...(ASIA_MIDDLE_EAST.includes(n) ? NEARBY : WORLD), country: countryName };
};

// Totals for a subtotal shipped to `countryName`.
export const quoteTotals = (subtotal, countryName) => {
  const rules = shippingRulesFor(countryName);
  const shippingFee = subtotal > rules.freeOver ? 0 : rules.shippingFee;
  const tax = Math.round(subtotal * rules.taxRate);
  return {
    shippingFee,
    tax,
    taxLabel: rules.taxLabel,
    total: subtotal + shippingFee + tax,
    codAvailable: rules.cod,
    zone: rules.zone,
    freeOver: rules.freeOver,
    international: rules.zone !== "domestic",
  };
};
