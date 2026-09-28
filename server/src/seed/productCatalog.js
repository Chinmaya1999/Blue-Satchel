// Real skincare products, fetched from each brand's official store on build.
// Regenerate rather than hand-editing prices/images. USD-listed stores (The
// Ordinary, COSRX, Beauty of Joseon) are converted at ₹88/USD.
const productCatalog = [
  {
    "name": "Salicylic Acid + LHA 2% Cleanser",
    "brand": "Minimalist",
    "category": "cleanser",
    "price": 269,
    "compareAtPrice": 299,
    "description": "2% salicylic acid + LHA gel cleanser that unclogs pores and controls excess oil without over-drying.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0410/9608/5665/files/SalicylicCleanserNew.jpg?v=1756796206",
    "productUrl": "https://beminimalist.co/products/salicylic-lha-2-cleanser",
    "tags": [
      "pores",
      "acne",
      "oiliness",
      "texture"
    ],
    "skinTypes": [
      "oily",
      "combination"
    ],
    "ingredients": [
      "Salicylic Acid",
      "LHA",
      "Zinc PCA"
    ]
  },
  {
    "name": "2% Salicylic Acid Gel Face Wash with Salicylic Acid & Witch Hazel - 100ml",
    "brand": "The Derma Co",
    "category": "cleanser",
    "price": 329,
    "description": "Deep-cleansing gel face wash with 2% salicylic acid and witch hazel for acne-prone, oily skin.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0888/8057/8807/files/pdp_2_salicylic_fw.jpg?v=1758287053",
    "productUrl": "https://www.thedermaco.com/products/2-salicylic-acid-gel-face-wash-the-dermaco-100ml",
    "tags": [
      "acne",
      "oiliness",
      "pores"
    ],
    "skinTypes": [
      "oily",
      "combination"
    ],
    "ingredients": [
      "Salicylic Acid 2%",
      "Witch Hazel"
    ]
  },
  {
    "name": "Green Tea Pore Cleansing Face Wash For Oily & Acne-Prone Skin",
    "brand": "Plum",
    "category": "cleanser",
    "price": 242,
    "compareAtPrice": 285,
    "description": "Soap-free green tea face wash that clears pores and removes excess oil gently.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0390/2985/files/Listing_1st_Tile_GT_FW_150ml_1001x1001_px.webp?v=1779351297",
    "productUrl": "https://www.plumgoodness.com/products/green-tea-pore-cleansing-face-wash",
    "tags": [
      "pores",
      "oiliness"
    ],
    "skinTypes": [
      "oily",
      "combination",
      "normal"
    ],
    "ingredients": [
      "Green Tea",
      "Glycolic Acid"
    ]
  },
  {
    "name": "Low pH Good Morning Gel Cleanser",
    "brand": "COSRX",
    "category": "cleanser",
    "price": 879,
    "description": "Mild, low-pH gel cleanser that respects the skin barrier — ideal for sensitive or dry skin.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0513/3775/6828/files/low-ph-good-morning-gel-cleanser-cosrx-official-1.jpg?v=1768785801",
    "productUrl": "https://www.cosrx.com/products/low-ph-good-morning-gel-cleanser",
    "tags": [
      "texture",
      "redness",
      "hydration"
    ],
    "skinTypes": [
      "normal",
      "combination",
      "sensitive",
      "dry"
    ],
    "ingredients": [
      "Tea Tree Oil",
      "BHA",
      "Low pH 5.0"
    ]
  },
  {
    "name": "Perfectly Balanced Foaming Cleanser",
    "brand": "Paula's Choice",
    "category": "cleanser",
    "price": 750,
    "description": "Gentle foaming cleanser with antioxidants that balances skin while supporting anti-aging routines.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0709/4118/0185/products/SKU7830.png?v=1674010060",
    "productUrl": "https://www.paulaschoice.in/products/resist-perfectly-balanced-foaming-cleanser",
    "tags": [
      "wrinkles",
      "hydration"
    ],
    "skinTypes": [
      "normal",
      "combination",
      "oily"
    ],
    "ingredients": [
      "Glycerin",
      "Antioxidants"
    ]
  },
  {
    "name": "Glucoside Foaming Cleanser",
    "brand": "The Ordinary",
    "category": "cleanser",
    "price": 629,
    "description": "Gentle foaming cleanser that lifts impurities while leaving the barrier comfortable.",
    "imageUrl": "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dw738b59ce/Images/products/The%20Ordinary/rdn-glucoside-foaming-cleanser-50ml.png?sw=900&sh=900&sm=fit",
    "productUrl": "https://theordinary.com/en-in/glucoside-foaming-face-cleanser-100616.html",
    "tags": [
      "hydration",
      "redness"
    ],
    "skinTypes": [
      "dry",
      "sensitive",
      "normal"
    ],
    "ingredients": [
      "Glucoside Surfactants",
      "Amino Acids"
    ]
  },
  {
    "name": "2% BHA Liquid Exfoliant",
    "brand": "Paula's Choice",
    "category": "toner",
    "price": 1200,
    "description": "Cult leave-on BHA exfoliant that unclogs pores, smooths texture and brightens tone.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0709/4118/0185/files/655439020107_Cover.jpg?v=1756970986",
    "productUrl": "https://www.paulaschoice.in/products/skin-perfecting-2-bha-liquid-exfoliant",
    "tags": [
      "pores",
      "texture",
      "acne",
      "oiliness",
      "brightening"
    ],
    "skinTypes": [
      "oily",
      "combination",
      "normal"
    ],
    "ingredients": [
      "Salicylic Acid 2%",
      "Green Tea"
    ]
  },
  {
    "name": "Glycolic Acid 7% Exfoliating Toner",
    "brand": "The Ordinary",
    "category": "toner",
    "price": 859,
    "description": "AHA exfoliating toner that resurfaces dull, uneven texture for a brighter look.",
    "imageUrl": "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dw8b57fa2b/Images/products/The%20Ordinary/ord-glyc-acid-7pct-100ml-Aug-UPC.png?sw=900&sh=900&sm=fit",
    "productUrl": "https://theordinary.com/en-in/glycolic-acid-7-exfoliating-toner-100418.html",
    "tags": [
      "texture",
      "brightening",
      "spots"
    ],
    "skinTypes": [
      "normal",
      "combination",
      "oily"
    ],
    "ingredients": [
      "Glycolic Acid 7%",
      "Tasmanian Pepperberry"
    ]
  },
  {
    "name": "Niacinamide 10% + Zinc 1%",
    "brand": "The Ordinary",
    "category": "serum",
    "price": 569,
    "description": "Best-selling niacinamide serum that visibly minimises pores and balances oil.",
    "imageUrl": "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dwce8a7cdf/Images/products/The%20Ordinary/rdn-niacinamide-10pct-zinc-1pct-30ml.png?sw=900&sh=900&sm=fit",
    "productUrl": "https://theordinary.com/en-in/niacinamide-10-zinc-1-serum-100436.html",
    "tags": [
      "pores",
      "oiliness",
      "acne",
      "spots"
    ],
    "skinTypes": [
      "oily",
      "combination",
      "normal"
    ],
    "ingredients": [
      "Niacinamide 10%",
      "Zinc PCA 1%"
    ]
  },
  {
    "name": "Niacinamide 10% Face Serum",
    "brand": "Minimalist",
    "category": "serum",
    "price": 237,
    "compareAtPrice": 249,
    "description": "Niacinamide serum that reduces blemishes, refines pores and controls sebum.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0410/9608/5665/files/Nia10New.png?v=1721398127",
    "productUrl": "https://beminimalist.co/products/niacinamide-10-with-matmarine",
    "tags": [
      "pores",
      "spots",
      "oiliness"
    ],
    "skinTypes": [
      "oily",
      "combination",
      "normal"
    ],
    "ingredients": [
      "Niacinamide 10%",
      "Matmarine",
      "Zinc"
    ]
  },
  {
    "name": "Hyaluronic Acid 2% + B5 (Original Formulation)",
    "brand": "The Ordinary",
    "category": "serum",
    "price": 849,
    "description": "Multi-weight hyaluronic acid serum for deep hydration and plumper-looking skin.",
    "imageUrl": "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dw56cd0f2e/Images/products/The%20Ordinary/rdn-hyaluronic-acid-2pct-b5-30ml.png?sw=900&sh=900&sm=fit",
    "productUrl": "https://theordinary.com/en-in/hyaluronic-acid-2-b5-serum-original-formulation-100425.html",
    "tags": [
      "hydration",
      "texture"
    ],
    "skinTypes": [
      "dry",
      "normal",
      "combination",
      "sensitive",
      "oily"
    ],
    "ingredients": [
      "Hyaluronic Acid",
      "Vitamin B5"
    ]
  },
  {
    "name": "Hyaluronic + PGA 2% Face Serum",
    "brand": "Minimalist",
    "category": "serum",
    "price": 237,
    "compareAtPrice": 249,
    "description": "Lightweight hyaluronic + PGA serum that holds moisture in dehydrated skin.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0410/9608/5665/products/HAPGA2_1200-1-min.png?v=1646395962",
    "productUrl": "https://beminimalist.co/products/2-hyaluronic-acid",
    "tags": [
      "hydration"
    ],
    "skinTypes": [
      "dry",
      "normal",
      "combination",
      "sensitive",
      "oily"
    ],
    "ingredients": [
      "Hyaluronic Acid",
      "PGA"
    ]
  },
  {
    "name": "Vitamin C 10% Face Serum",
    "brand": "Minimalist",
    "category": "serum",
    "price": 284,
    "compareAtPrice": 299,
    "description": "Stable vitamin C serum that boosts radiance and fades dullness and dark spots.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0410/9608/5665/products/VitaminC10_1200-1-min.png?v=1646543848",
    "productUrl": "https://beminimalist.co/products/vitamin-c-ethyl-ascorbic-acid-10-acetyl-glucosamine-1",
    "tags": [
      "brightening",
      "spots",
      "dark-circles"
    ],
    "skinTypes": [
      "normal",
      "combination",
      "oily",
      "dry"
    ],
    "ingredients": [
      "Ethyl Ascorbic Acid 10%",
      "Acetyl Glucosamine"
    ]
  },
  {
    "name": "Ascorbyl Glucoside Solution 12%",
    "brand": "The Ordinary",
    "category": "serum",
    "price": 1409,
    "description": "Gentle, water-light vitamin C solution for a brighter, more even complexion.",
    "imageUrl": "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dw345ba9db/Images/products/The%20Ordinary/rdn-ascorbyl-glucoside-solution-12pct-30ml.png?sw=900&sh=900&sm=fit",
    "productUrl": "https://theordinary.com/en-in/ascorbyl-glucoside-solution-12-vitamin-c-100405.html",
    "tags": [
      "brightening",
      "spots"
    ],
    "skinTypes": [
      "normal",
      "combination",
      "oily",
      "sensitive"
    ],
    "ingredients": [
      "Ascorbyl Glucoside 12%"
    ]
  },
  {
    "name": "Glow Serum : Propolis + Niacinamide",
    "brand": "Beauty of Joseon",
    "category": "serum",
    "price": 1199,
    "compareAtPrice": 1499,
    "description": "Propolis + niacinamide serum that calms breakouts and adds a healthy glow.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0558/4135/7989/files/glow-serum-propolis-niacinamide-1-front.webp?v=1770278801",
    "productUrl": "https://beautyofjoseon.com/products/glow-serum-propolis-niacinamide",
    "tags": [
      "brightening",
      "acne",
      "hydration"
    ],
    "skinTypes": [
      "normal",
      "combination",
      "oily"
    ],
    "ingredients": [
      "Propolis Extract",
      "Niacinamide"
    ]
  },
  {
    "name": "Alpha Arbutin 2% + HA",
    "brand": "The Ordinary",
    "category": "serum",
    "price": 1089,
    "description": "Targets dark spots and uneven tone with concentrated alpha arbutin.",
    "imageUrl": "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dwa689472f/Images/products/The%20Ordinary/FY25-D41247-ORD-Web-Alp-Arb-2pct-30ml-1x1-EN-1.jpg?sw=900&sh=900&sm=fit",
    "productUrl": "https://theordinary.com/en-in/alpha-arbutin-2-ha-serum-100401.html",
    "tags": [
      "spots",
      "brightening"
    ],
    "skinTypes": [
      "normal",
      "combination",
      "oily",
      "dry",
      "sensitive"
    ],
    "ingredients": [
      "Alpha Arbutin 2%",
      "Hyaluronic Acid"
    ]
  },
  {
    "name": "Tranexamic 3% Face Serum",
    "brand": "Minimalist",
    "category": "serum",
    "price": 584,
    "compareAtPrice": 649,
    "description": "Tranexamic acid serum for stubborn pigmentation and post-acne marks.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0410/9608/5665/files/TranNew.png?v=1721398127",
    "productUrl": "https://beminimalist.co/products/tranexamic-3-hpa",
    "tags": [
      "spots",
      "brightening"
    ],
    "skinTypes": [
      "normal",
      "combination",
      "oily",
      "dry"
    ],
    "ingredients": [
      "Tranexamic Acid 3%",
      "HPA"
    ]
  },
  {
    "name": "2% Kojic Acid Face Serum with 1% Alpha Arbutin & Niacinamide - 30 ml",
    "brand": "The Derma Co",
    "category": "serum",
    "price": 599,
    "description": "Pigmentation serum combining kojic acid, alpha arbutin and niacinamide.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0888/8057/8807/files/2-kojic_PDP-30ml.png?v=1787832037",
    "productUrl": "https://www.thedermaco.com/products/2-kojic-acid-face-serum-with-1-alpha-arbutin-niacinamide-30-ml",
    "tags": [
      "spots",
      "brightening"
    ],
    "skinTypes": [
      "normal",
      "combination",
      "oily"
    ],
    "ingredients": [
      "Kojic Acid 2%",
      "Alpha Arbutin 1%",
      "Niacinamide"
    ]
  },
  {
    "name": "Advanced Snail 96 Mucin Power Essence",
    "brand": "COSRX",
    "category": "serum",
    "price": 879,
    "description": "Iconic snail mucin essence that repairs, hydrates and smooths rough texture.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0513/3775/6828/files/james_800x1067_1_1_4e9750cc-2cd6-4817-ace5-be2305a85806.jpg?v=1763111577",
    "productUrl": "https://www.cosrx.com/products/advanced-snail-96-mucin-power-essence",
    "tags": [
      "hydration",
      "texture",
      "redness"
    ],
    "skinTypes": [
      "dry",
      "normal",
      "combination",
      "sensitive",
      "oily"
    ],
    "ingredients": [
      "Snail Secretion Filtrate 96%"
    ]
  },
  {
    "name": "Soothing & Barrier Support Serum",
    "brand": "The Ordinary",
    "category": "serum",
    "price": 1619,
    "description": "Calming serum that visibly reduces redness and supports a stressed barrier.",
    "imageUrl": "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dw9e4e9531/Images/products/The%20Ordinary/SBSS%20PackShot.png?sw=900&sh=900&sm=fit",
    "productUrl": "https://theordinary.com/en-in/soothing-barrier-support-serum-100634.html",
    "tags": [
      "redness",
      "hydration"
    ],
    "skinTypes": [
      "sensitive",
      "dry",
      "normal"
    ],
    "ingredients": [
      "Centella",
      "Ceramides",
      "Colloidal Oatmeal"
    ]
  },
  {
    "name": "Azelaic Acid Suspension 10%",
    "brand": "The Ordinary",
    "category": "treatment",
    "price": 2739,
    "description": "Brightening cream-gel that targets redness, blemishes and uneven texture.",
    "imageUrl": "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dwedfce090/Images/products/The%20Ordinary/rdn-azelaic-acid-suspension-10pct-100ml.png?sw=900&sh=900&sm=fit",
    "productUrl": "https://theordinary.com/en-in/azelaic-acid-suspension-10-exfoliator-100407.html",
    "tags": [
      "redness",
      "acne",
      "texture",
      "spots"
    ],
    "skinTypes": [
      "normal",
      "combination",
      "oily",
      "sensitive"
    ],
    "ingredients": [
      "Azelaic Acid 10%"
    ]
  },
  {
    "name": "Multi-Peptides 10% Face Serum",
    "brand": "Minimalist",
    "category": "serum",
    "price": 629,
    "compareAtPrice": 699,
    "description": "Peptide serum that firms skin and softens fine lines and wrinkles.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0410/9608/5665/files/MultiNew.png?v=1721398128",
    "productUrl": "https://beminimalist.co/products/multi-peptide-serum-7-matrixyl-3000-3-bio-placenta",
    "tags": [
      "wrinkles",
      "firmness",
      "anti-aging"
    ],
    "skinTypes": [
      "normal",
      "dry",
      "combination",
      "oily"
    ],
    "ingredients": [
      "Matrixyl 3000",
      "Multi-Peptides"
    ]
  },
  {
    "name": "Multi-Peptide + HA Serum",
    "brand": "The Ordinary",
    "category": "serum",
    "price": 1889,
    "description": "The 'Buffet' multi-peptide serum for visible signs of aging and loss of firmness.",
    "imageUrl": "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dw68423659/Images/products/The%20Ordinary/rdn-multi-peptide-ha-serum-30ml.png?sw=900&sh=900&sm=fit",
    "productUrl": "https://theordinary.com/en-in/multi-peptide-ha-serum-100613.html",
    "tags": [
      "wrinkles",
      "firmness",
      "anti-aging",
      "hydration"
    ],
    "skinTypes": [
      "normal",
      "dry",
      "combination",
      "sensitive",
      "oily"
    ],
    "ingredients": [
      "Matrixyl 3000",
      "Argireline",
      "Hyaluronic Acid"
    ]
  },
  {
    "name": "Retinal 0.1% Face Serum",
    "brand": "Minimalist",
    "category": "treatment",
    "price": 719,
    "compareAtPrice": 799,
    "description": "Night retinal serum that works faster than retinol on lines, firmness and texture.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0410/9608/5665/files/DomesticMain.png?v=1729750815",
    "productUrl": "https://beminimalist.co/products/retinal-0-1-face-serum",
    "tags": [
      "wrinkles",
      "firmness",
      "texture",
      "anti-aging"
    ],
    "skinTypes": [
      "normal",
      "combination",
      "oily",
      "dry"
    ],
    "ingredients": [
      "Retinal 0.1%"
    ]
  },
  {
    "name": "Retinal 0.2% Emulsion",
    "brand": "The Ordinary",
    "category": "treatment",
    "price": 1419,
    "description": "Potent retinal emulsion that targets wrinkles and uneven texture overnight.",
    "imageUrl": "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dwa863ca2c/Images/products/The%20Ordinary/ord-retinal-02-emulsion-15ml.png?sw=900&sh=900&sm=fit",
    "productUrl": "https://theordinary.com/en-in/retinal-02-emulsion-100646.html",
    "tags": [
      "wrinkles",
      "texture",
      "anti-aging",
      "firmness"
    ],
    "skinTypes": [
      "normal",
      "combination",
      "oily",
      "dry"
    ],
    "ingredients": [
      "Retinal 0.2%"
    ]
  },
  {
    "name": "Salicylic Acid 2% Solution",
    "brand": "The Ordinary",
    "category": "treatment",
    "price": 629,
    "description": "Targeted BHA solution that clears blemishes and congested pores.",
    "imageUrl": "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dwcece52fb/Images/products/The%20Ordinary/rdn-salicylic-acid-2pct-solution-30ml.png?sw=900&sh=900&sm=fit",
    "productUrl": "https://theordinary.com/en-in/salicylic-acid-2-solution-exfoliator-100619.html",
    "tags": [
      "acne",
      "pores",
      "oiliness"
    ],
    "skinTypes": [
      "oily",
      "combination"
    ],
    "ingredients": [
      "Salicylic Acid 2%"
    ]
  },
  {
    "name": "Salicylic Acid 2% Face Serum",
    "brand": "Minimalist",
    "category": "treatment",
    "price": 237,
    "compareAtPrice": 249,
    "description": "Leave-on salicylic acid serum that reduces active acne and blackheads.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0410/9608/5665/products/SalicylicAcid2_1200-1-min.png?v=1646458899",
    "productUrl": "https://beminimalist.co/products/salicylic-acid-2",
    "tags": [
      "acne",
      "pores",
      "oiliness"
    ],
    "skinTypes": [
      "oily",
      "combination"
    ],
    "ingredients": [
      "Salicylic Acid 2%",
      "LHA"
    ]
  },
  {
    "name": "Acne Pimple Master Patch",
    "brand": "COSRX",
    "category": "treatment",
    "price": 619,
    "description": "Hydrocolloid patches that flatten pimples overnight and stop picking.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0513/3775/6828/files/acne-pimple-master-patch-cosrx-official-1.jpg?v=1724835736",
    "productUrl": "https://www.cosrx.com/products/acne-pimple-master-patch",
    "tags": [
      "acne"
    ],
    "skinTypes": [
      "oily",
      "combination",
      "normal",
      "sensitive",
      "dry"
    ],
    "ingredients": [
      "Hydrocolloid"
    ]
  },
  {
    "name": "Caffeine Solution 5% + EGCG Eye Serum",
    "brand": "The Ordinary",
    "category": "eye-care",
    "price": 869,
    "description": "Caffeine eye serum that reduces puffiness and the look of dark circles.",
    "imageUrl": "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dw3c5e95f9/Images/products/The%20Ordinary/2020-08-17-ORD-Product-Caff-Sol-5pct-ECCG-Eye-Serum-updated.png?sw=900&sh=900&sm=fit",
    "productUrl": "https://theordinary.com/en-in/caffeine-solution-5-egcg-eye-serum-100412.html",
    "tags": [
      "dark-circles",
      "eye-bags"
    ],
    "skinTypes": [
      "normal",
      "dry",
      "combination",
      "oily",
      "sensitive"
    ],
    "ingredients": [
      "Caffeine 5%",
      "EGCG"
    ]
  },
  {
    "name": "Multi-Peptide Eye Serum",
    "brand": "The Ordinary",
    "category": "eye-care",
    "price": 2379,
    "description": "Peptide eye serum that targets dark circles, puffiness and fine lines.",
    "imageUrl": "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dw9d7fd4b6/Images/products/The%20Ordinary/FY25-D41247-ORD-Web-PDP-Mlt-Pptd-Eye-1x1-EN-1.jpg?sw=900&sh=900&sm=fit",
    "productUrl": "https://theordinary.com/en-in/multi-peptide-eye-serum-100620.html",
    "tags": [
      "dark-circles",
      "eye-bags",
      "wrinkles",
      "firmness"
    ],
    "skinTypes": [
      "normal",
      "dry",
      "combination",
      "oily",
      "sensitive"
    ],
    "ingredients": [
      "Multi-Peptides",
      "Caffeine"
    ]
  },
  {
    "name": "Revive Eye Serum : Ginseng + Retinal",
    "brand": "Beauty of Joseon",
    "category": "eye-care",
    "price": 1499,
    "description": "Ginseng + retinal eye serum that firms the eye area and softens crow's feet.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0558/4135/7989/files/revive-eye-serum-ginseng-retinal-1-front.webp?v=1770287139",
    "productUrl": "https://beautyofjoseon.com/products/revive-eye-serum-ginseng-retinal",
    "tags": [
      "wrinkles",
      "firmness",
      "eye-bags",
      "dark-circles"
    ],
    "skinTypes": [
      "normal",
      "dry",
      "combination",
      "oily"
    ],
    "ingredients": [
      "Ginseng",
      "Retinal"
    ]
  },
  {
    "name": "Vitamin K + Retinal 1% Eye Cream",
    "brand": "Minimalist",
    "category": "eye-care",
    "price": 449,
    "compareAtPrice": 499,
    "description": "Eye cream that reduces dark circles, puffiness and fine lines.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0410/9608/5665/files/KRetinalNew.png?v=1721632054",
    "productUrl": "https://beminimalist.co/products/vitamin-k-retinal-01-eye-cream",
    "tags": [
      "dark-circles",
      "wrinkles",
      "eye-bags"
    ],
    "skinTypes": [
      "normal",
      "dry",
      "combination",
      "oily"
    ],
    "ingredients": [
      "Vitamin K",
      "Retinal 0.1%",
      "Caffeine"
    ]
  },
  {
    "name": "Pomegranate + Retinol Eye Cream for Dark Circles",
    "brand": "Dot & Key",
    "category": "eye-care",
    "price": 495,
    "description": "Retinol eye cream that brightens dark circles and smooths fine lines.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0361/8553/8692/files/1-Retinol-Eye-Cream_0dbf6882-9197-4d09-8d3f-55c8f95c1984.jpg?v=1727356057",
    "productUrl": "https://www.dotandkey.com/products/retinol-eye-cream",
    "tags": [
      "dark-circles",
      "wrinkles"
    ],
    "skinTypes": [
      "normal",
      "dry",
      "combination"
    ],
    "ingredients": [
      "Retinol",
      "Pomegranate"
    ]
  },
  {
    "name": "Oil Free Mattifying Gel Moisturiser",
    "brand": "Re'equil",
    "category": "moisturizer",
    "price": 405,
    "compareAtPrice": 450,
    "description": "Oil-free gel moisturiser that hydrates while keeping shine under control.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0306/6262/3364/files/Oil_free_mattifying_moisturiser_4632049f-27b7-415d-a783-941c494502c4.webp?v=1788197430",
    "productUrl": "https://www.reequil.com/products/oil-free-mattifying-moisturiser",
    "tags": [
      "oiliness",
      "pores",
      "acne"
    ],
    "skinTypes": [
      "oily",
      "combination"
    ],
    "ingredients": [
      "Niacinamide",
      "Zinc",
      "Hyaluronic Acid"
    ]
  },
  {
    "name": "Cica + Niacinamide Oil-Free Gel Moisturizer For Face",
    "brand": "Dot & Key",
    "category": "moisturizer",
    "price": 395,
    "description": "Fragrance-free cica gel moisturizer that calms acne-prone, oily skin.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0361/8553/8692/files/1_a546fc74-0b04-4f8a-b155-da1cd1b10052.jpg?v=1784012308",
    "productUrl": "https://www.dotandkey.com/products/cica-5-niacinamide-oil-free-moisturizer-for-dark-spots-acne-fragrance-free-oily-sensitive-acne-prone-skin",
    "tags": [
      "acne",
      "redness",
      "oiliness",
      "spots"
    ],
    "skinTypes": [
      "oily",
      "combination",
      "sensitive"
    ],
    "ingredients": [
      "Cica",
      "Niacinamide 5%"
    ]
  },
  {
    "name": "Vitamin B5 10% Moisturizer",
    "brand": "Minimalist",
    "category": "moisturizer",
    "price": 314,
    "compareAtPrice": 349,
    "description": "Lightweight gel-cream that hydrates and repairs without clogging pores.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0410/9608/5665/products/B5Moisturizer1200-2-min.png?v=1756800645",
    "productUrl": "https://beminimalist.co/products/vitamin-b5-10-moisturizer",
    "tags": [
      "hydration",
      "redness",
      "oiliness"
    ],
    "skinTypes": [
      "oily",
      "combination",
      "normal",
      "sensitive"
    ],
    "ingredients": [
      "Vitamin B5 10%",
      "Hyaluronic Acid"
    ]
  },
  {
    "name": "Ceramide & Hyaluronic Acid Moisturiser",
    "brand": "Re'equil",
    "category": "moisturizer",
    "price": 266,
    "compareAtPrice": 295,
    "description": "Barrier-repair moisturiser for normal to dry skin with ceramides and HA.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0306/6262/3364/files/Ceramide_moisturiser_a928c330-56e3-489a-8cea-24ead6e065c2.webp?v=1788196389",
    "productUrl": "https://www.reequil.com/products/ceramide-hyaluronic-acid-moisturiser-for-normal-to-dry-skin",
    "tags": [
      "hydration",
      "redness",
      "texture"
    ],
    "skinTypes": [
      "dry",
      "normal",
      "sensitive"
    ],
    "ingredients": [
      "Ceramides",
      "Hyaluronic Acid"
    ]
  },
  {
    "name": "Ceramides 0.3% + Madecassoside Moisturizer",
    "brand": "Minimalist",
    "category": "moisturizer",
    "price": 539,
    "compareAtPrice": 599,
    "description": "Ceramide + madecassoside cream that restores a dry, sensitised barrier.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0410/9608/5665/files/Ceramide_Madecassoside.png?v=1721398128",
    "productUrl": "https://beminimalist.co/products/ceramides-0-3-madecassoside",
    "tags": [
      "hydration",
      "redness"
    ],
    "skinTypes": [
      "dry",
      "sensitive",
      "normal"
    ],
    "ingredients": [
      "Ceramides 0.3%",
      "Madecassoside"
    ]
  },
  {
    "name": "Natural Moisturizing Factors + HA",
    "brand": "The Ordinary",
    "category": "moisturizer",
    "price": 629,
    "description": "Non-greasy moisturizer built from the skin's own natural moisturizing factors.",
    "imageUrl": "https://theordinary.com/dw/image/v2/BFKJ_PRD/on/demandware.static/-/Sites-deciem-master/default/dw51f90af8/Images/products/The%20Ordinary/rdn-natural-moisturizing-factors-ha-30ml.png?sw=900&sh=900&sm=fit",
    "productUrl": "https://theordinary.com/en-in/natural-moisturizing-factors-ha-moisturizer-100435.html",
    "tags": [
      "hydration",
      "texture"
    ],
    "skinTypes": [
      "dry",
      "normal",
      "combination",
      "sensitive",
      "oily"
    ],
    "ingredients": [
      "Amino Acids",
      "Hyaluronic Acid",
      "Ceramides"
    ]
  },
  {
    "name": "Balancium Comfort Ceramide Cream",
    "brand": "COSRX",
    "category": "moisturizer",
    "price": 2289,
    "description": "Rich ceramide cream that deeply nourishes dry, tight skin.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0513/3775/6828/files/balancium-comfort-ceramide-cream-cosrx-official-1.jpg?v=1724836862",
    "productUrl": "https://www.cosrx.com/products/balancium-comfort-ceramide-cream",
    "tags": [
      "hydration",
      "redness",
      "firmness"
    ],
    "skinTypes": [
      "dry",
      "sensitive",
      "normal"
    ],
    "ingredients": [
      "Ceramides",
      "Panthenol"
    ]
  },
  {
    "name": "Retinol Night Repair Cream with Ceramides",
    "brand": "Dot & Key",
    "category": "moisturizer",
    "price": 599,
    "description": "Night cream that pairs retinol with ceramides to firm and smooth fine lines.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0361/8553/8692/files/Artboard1_4e07de26-042d-4740-9234-d5e603068f7d.jpg?v=1789728010",
    "productUrl": "https://www.dotandkey.com/products/retinol-ceramide-age-defense-night-cream",
    "tags": [
      "wrinkles",
      "firmness",
      "texture",
      "anti-aging"
    ],
    "skinTypes": [
      "normal",
      "dry",
      "combination"
    ],
    "ingredients": [
      "Retinol",
      "Ceramides"
    ]
  },
  {
    "name": "SPF 50 Sunscreen",
    "brand": "Minimalist",
    "category": "sunscreen",
    "price": 224,
    "compareAtPrice": 249,
    "description": "Broad-spectrum SPF 50 PA++++ sunscreen with no white cast.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0410/9608/5665/files/SPF50New.jpg?v=1756795782",
    "productUrl": "https://beminimalist.co/products/multi-vitamin-spf-50",
    "tags": [
      "spots",
      "anti-aging",
      "brightening"
    ],
    "skinTypes": [
      "normal",
      "oily",
      "combination",
      "dry",
      "sensitive"
    ],
    "ingredients": [
      "UV Filters",
      "Multi-Vitamins"
    ]
  },
  {
    "name": "Light Fluid SPF 50 Sunscreen",
    "brand": "Minimalist",
    "category": "sunscreen",
    "price": 314,
    "compareAtPrice": 349,
    "description": "Ultra-light fluid SPF 50 for oily skin — dries down matte.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0410/9608/5665/files/Artboard_1_1.jpg?v=1783323907",
    "productUrl": "https://beminimalist.co/products/light-fluid-spf-50-sunscreen",
    "tags": [
      "oiliness",
      "spots"
    ],
    "skinTypes": [
      "oily",
      "combination",
      "normal"
    ],
    "ingredients": [
      "UV Filters"
    ]
  },
  {
    "name": "C-Cinamide Radiance Sunscreen Aqua Gel with SPF 50 & PA++++ - 50g",
    "brand": "The Derma Co",
    "category": "sunscreen",
    "price": 499,
    "description": "Aqua-gel SPF 50 PA++++ with vitamin C and niacinamide for a radiant finish.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0888/8057/8807/files/fop_c-cinamide_white_bg.jpg?v=1758286799",
    "productUrl": "https://www.thedermaco.com/products/c-cinamide-radiance-sunscreen-aqua-gel-with-spf-50-pa-50g",
    "tags": [
      "brightening",
      "spots",
      "oiliness"
    ],
    "skinTypes": [
      "oily",
      "combination",
      "normal"
    ],
    "ingredients": [
      "Vitamin C",
      "Niacinamide",
      "UV Filters"
    ]
  },
  {
    "name": "Cica + Niacinamide Sunscreen, In-Vivo Tested SPF 50+ PA++++",
    "brand": "Dot & Key",
    "category": "sunscreen",
    "price": 445,
    "description": "Mattifying SPF 50+ with cica — calm, oil-free protection for acne-prone skin.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0361/8553/8692/files/1CicaSunscreenListing1-50g.jpg?v=1778925569",
    "productUrl": "https://www.dotandkey.com/products/cica-calming-mattifying-sunscreen-spf-50-pa",
    "tags": [
      "redness",
      "oiliness",
      "acne"
    ],
    "skinTypes": [
      "oily",
      "combination",
      "sensitive"
    ],
    "ingredients": [
      "Cica",
      "Niacinamide",
      "UV Filters"
    ]
  },
  {
    "name": "Vitamin C + E 100% Mineral Sunscreen IN-VIVO tested SPF 50+, PA++++",
    "brand": "Dot & Key",
    "category": "sunscreen",
    "price": 649,
    "description": "100% mineral SPF 50+ sunscreen — gentle on sensitive skin.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0361/8553/8692/files/1a_055631d9-8489-46d1-bddf-bd21e2b6e9aa.jpg?v=1771219495",
    "productUrl": "https://www.dotandkey.com/products/vitamin-c-e-mineral-sunscreen",
    "tags": [
      "brightening",
      "redness",
      "spots"
    ],
    "skinTypes": [
      "sensitive",
      "dry",
      "normal"
    ],
    "ingredients": [
      "Zinc Oxide",
      "Vitamin C",
      "Vitamin E"
    ]
  },
  {
    "name": "Skin Restoring Moisturizer SPF 50",
    "brand": "Paula's Choice",
    "category": "sunscreen",
    "price": 900,
    "description": "Hydrating moisturizer + SPF 50 in one step with anti-aging antioxidants.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0709/4118/0185/products/Resist.png?v=1674010554",
    "productUrl": "https://www.paulaschoice.in/products/resist-skin-restoring-moisturizer-spf-50",
    "tags": [
      "wrinkles",
      "firmness",
      "hydration",
      "anti-aging"
    ],
    "skinTypes": [
      "dry",
      "normal"
    ],
    "ingredients": [
      "UV Filters",
      "Antioxidants",
      "Ceramides"
    ]
  }
];

export default productCatalog;
