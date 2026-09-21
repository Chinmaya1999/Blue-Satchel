import Product from "../models/Product.js";

/**
 * Recommendation Service (Section 5.2 "Recommendation Services")
 * Rule-based mapping from the AI diagnostic concern severities to the
 * product catalogue: highest-severity concerns are matched against product
 * tags first, then backfilled with bestsellers so a full set is always
 * returned even for a very healthy scan.
 */
export const recommendProducts = async (concerns, { skinType, limit = 4 } = {}) => {
  const sorted = [...concerns].sort((a, b) => b.severity - a.severity);
  const priorityTags = sorted.filter((c) => c.severity >= 25).map((c) => c.key);

  const picked = [];
  const usedIds = new Set();

  for (const tag of priorityTags) {
    if (picked.length >= limit) break;
    const query = { isActive: true, tags: tag };
    if (skinType && skinType !== "unknown") {
      query.$or = [{ skinTypes: skinType }, { skinTypes: { $size: 0 } }];
    }
    const matches = await Product.find(query).sort({ rating: -1 }).limit(limit - picked.length);
    for (const m of matches) {
      if (!usedIds.has(String(m._id))) {
        picked.push(m);
        usedIds.add(String(m._id));
      }
    }
  }

  if (picked.length < limit) {
    const fallback = await Product.find({
      isActive: true,
      _id: { $nin: [...usedIds] },
    })
      .sort({ bestseller: -1, rating: -1 })
      .limit(limit - picked.length);
    for (const f of fallback) {
      picked.push(f);
      usedIds.add(String(f._id));
    }
  }

  return picked.slice(0, limit);
};
