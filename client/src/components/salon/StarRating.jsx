import { Star } from "lucide-react";

// Read-only stars (value 0-5, halves shown by rounding).
export const Stars = ({ value = 0, size = 14 }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} size={size} className={i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-400/50"} />
    ))}
  </span>
);

// Clickable stars for leaving a review.
export const StarInput = ({ value, onChange, size = 26 }) => (
  <span className="inline-flex gap-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <button key={i} type="button" onClick={() => onChange(i)} aria-label={`${i} star${i > 1 ? "s" : ""}`}>
        <Star size={size} className={i <= value ? "fill-amber-400 text-amber-400" : "text-slate-400/60"} />
      </button>
    ))}
  </span>
);
