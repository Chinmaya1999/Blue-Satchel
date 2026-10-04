import Product from "../models/Product.js";
import productCatalog from "../seed/productCatalog.js";
import houseProducts from "../seed/houseProducts.js";

const allProducts = [...houseProducts, ...productCatalog];

// Placeholder products from the original seed. They're hidden rather than
// deleted so past orders and scans that reference them keep resolving.
const LEGACY_DEMO_NAMES = [
  "Clarify Gel Cleanser",
  "Hydra Cream Cleanser",
  "Niacinamide 10% Serum",
  "Vitamin C Brightening Serum",
  "Hyaluronic Acid Hydra Serum",
  "Caffeine Eye Serum",
  "Redness Relief Serum",
  "Barrier Repair Moisturizer",
  "Oil-Free Gel Moisturizer",
  "Retinol Night Cream",
  "Daily Defense SPF 50 Sunscreen",
  "Tinted Mineral Sunscreen",
  "Salicylic Acid Spot Treatment",
  "Pore Refining Clay Mask",
  "Overnight Hydration Mask",
  "Balancing Toner",
];

/**
 * Brings the database in line with productCatalog.js on every server start,
 * so a deploy is enough to ship catalogue changes (no manual seed against
 * production). Idempotent: catalogue products are upserted by brand + name,
 * leaving stock and anything else an admin changed that the catalogue
 * doesn't set untouched.
 */
export const syncProductCatalog = async () => {
  // One-time rename: the house brand used to be "Blue Satchel" (then "DXB BEAUTY").
  // Rewrite existing rows so the upsert below matches them instead of creating duplicates.
  await Product.updateMany({ brand: { $in: ["Blue Satchel", "DXB BEAUTY"] } }, [
    {
      $set: {
        brand: "DXB Beauty",
        name: {
          $replaceOne: {
            input: { $replaceOne: { input: "$name", find: "Blue Satchel", replacement: "DXB Beauty" } },
            find: "DXB BEAUTY",
            replacement: "DXB Beauty",
          },
        },
      },
    },
  ]);

  const ops = allProducts.map((p) => ({
    updateOne: {
      filter: { brand: p.brand, name: p.name },
      update: { $set: { ...p, isActive: true } },
      upsert: true,
    },
  }));
  const result = await Product.bulkWrite(ops);

  const hidden = await Product.updateMany(
    { brand: "DXB Beauty", name: { $in: LEGACY_DEMO_NAMES }, isActive: true },
    { $set: { isActive: false } }
  );

  console.log(
    `[catalog] ${allProducts.length} products synced (${result.upsertedCount} new, ${result.modifiedCount} updated), ${hidden.modifiedCount} demo products hidden.`
  );
};
