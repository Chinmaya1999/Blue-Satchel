// Salon prices are stored in paise (integer). Show them as rupees.
export const formatPaise = (paise) =>
  `₹${((paise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// "12.5" -> 1250. Returns null for anything that isn't a valid amount.
export const rupeesToPaise = (value) => {
  const n = Number(value);
  return value !== "" && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

export const paiseToRupees = (paise) => ((paise || 0) / 100).toFixed(2);

export const SCAN_MODES = [
  { key: "quick", label: "Quick Scan" },
  { key: "focus", label: "Focus Scan" },
  { key: "detailed", label: "Detailed Scan (3 angles)" },
];

export const imgSrc = (url) => url || "";
