// DXB BEAUTY's own products. `featured` puts them first in the shop and
// guarantees each one a slot in every scan's recommended routine (the serum
// and moisturizer steps are always part of a routine).
const houseProducts = [
  {
    name: "DXB BEAUTY Skin Balance Serum",
    brand: "DXB BEAUTY",
    category: "serum",
    price: 799,
    compareAtPrice: 999,
    description:
      "Our everyday balancing serum: 5% niacinamide, multi-weight hyaluronic acid and panthenol work together to refine pores, smooth texture, hydrate and even out tone — for every skin type.",
    imageUrl: "/products/niacinamide-serum.svg",
    tags: ["pores", "texture", "hydration", "spots", "brightening", "oiliness", "redness"],
    skinTypes: [],
    ingredients: ["Niacinamide 5%", "Hyaluronic Acid", "Panthenol", "Zinc PCA"],
    bestseller: true,
    featured: true,
  },
  {
    name: "DXB BEAUTY Barrier Renew Cream",
    brand: "DXB BEAUTY",
    category: "moisturizer",
    price: 899,
    compareAtPrice: 1099,
    description:
      "A lightweight ceramide + peptide cream that repairs the skin barrier, locks in moisture, calms redness and supports firmness — non-greasy on oily skin, comforting on dry skin.",
    imageUrl: "/products/barrier-repair-moisturizer.svg",
    tags: ["hydration", "redness", "firmness", "wrinkles", "texture"],
    skinTypes: [],
    ingredients: ["Ceramide NP", "Matrixyl 3000", "Squalane", "Centella Asiatica"],
    bestseller: true,
    featured: true,
  },
];

export default houseProducts;
