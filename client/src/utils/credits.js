// Scan costs normally come from the server (usePricing) since admins can make
// Quick Scan free. These list prices mirror server BASE_SCAN_COSTS and are
// only a fallback if the pricing request fails; the server always enforces
// the real cost.
export const DEFAULT_SCAN_COSTS = { detailed: 100, quick: 50, focus: 50 };

// Cheapest scan that's actually offered (Focus Scan isn't live yet).
export const minScanCost = (costs) => Math.min(costs.detailed, costs.quick);

export const isUnlimited = (user) => user?.role === "admin";

export const canAfford = (user, cost) => isUnlimited(user) || (user?.credits ?? 0) >= cost;

export const buyCreditsPath = (cost, next) =>
  `/credits?need=${cost}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
