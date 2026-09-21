import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import mongoose from "mongoose";

const products = [
  {
    name: "Clarify Gel Cleanser",
    category: "cleanser",
    price: 649,
    compareAtPrice: 799,
    description: "A gentle salicylic-acid gel cleanser that clears pores without stripping the skin barrier.",
    imageUrl: "/products/clarify-gel-cleanser.svg",
    tags: ["pores", "acne", "spots"],
    skinTypes: ["oily", "combination"],
    ingredients: ["Salicylic Acid", "Niacinamide", "Aloe Vera"],
    bestseller: true,
    rating: 4.6,
    reviewCount: 812,
  },
  {
    name: "Hydra Cream Cleanser",
    category: "cleanser",
    price: 599,
    description: "Creamy, non-foaming cleanser that removes impurities while locking in moisture.",
    imageUrl: "/products/hydra-cream-cleanser.svg",
    tags: ["hydration", "redness"],
    skinTypes: ["dry", "sensitive"],
    ingredients: ["Ceramides", "Glycerin", "Oat Extract"],
    rating: 4.5,
    reviewCount: 340,
  },
  {
    name: "Niacinamide 10% Serum",
    category: "serum",
    price: 899,
    compareAtPrice: 1099,
    description: "High-strength niacinamide serum that visibly refines pores and evens out spots.",
    imageUrl: "/products/niacinamide-serum.svg",
    tags: ["pores", "spots", "brightening"],
    skinTypes: ["oily", "combination", "normal"],
    ingredients: ["Niacinamide 10%", "Zinc PCA"],
    bestseller: true,
    rating: 4.7,
    reviewCount: 1204,
  },
  {
    name: "Vitamin C Brightening Serum",
    category: "serum",
    price: 1099,
    description: "Antioxidant-rich vitamin C serum that fades spots and brightens dull, uneven texture.",
    imageUrl: "/products/vitamin-c-serum.svg",
    tags: ["spots", "texture", "brightening", "anti-aging"],
    skinTypes: ["normal", "combination", "dry"],
    ingredients: ["Vitamin C 15%", "Vitamin E", "Ferulic Acid"],
    bestseller: true,
    rating: 4.8,
    reviewCount: 980,
  },
  {
    name: "Hyaluronic Acid Hydra Serum",
    category: "serum",
    price: 799,
    description: "Multi-weight hyaluronic acid serum for deep, lasting hydration and plumper skin.",
    imageUrl: "/products/hyaluronic-serum.svg",
    tags: ["hydration", "texture"],
    skinTypes: ["dry", "sensitive", "normal"],
    ingredients: ["Hyaluronic Acid", "Panthenol"],
    rating: 4.6,
    reviewCount: 645,
  },
  {
    name: "Caffeine Eye Serum",
    category: "serum",
    price: 749,
    description: "Fast-absorbing eye serum with caffeine and peptides to visibly reduce dark circles.",
    imageUrl: "/products/caffeine-eye-serum.svg",
    tags: ["dark-circles", "anti-aging"],
    skinTypes: ["normal", "dry", "sensitive"],
    ingredients: ["Caffeine", "Peptide Complex", "Vitamin K"],
    bestseller: true,
    rating: 4.5,
    reviewCount: 512,
  },
  {
    name: "Redness Relief Serum",
    category: "serum",
    price: 849,
    description: "Centella-based calming serum that soothes visible redness and reactive skin.",
    imageUrl: "/products/redness-relief-serum.svg",
    tags: ["redness", "hydration"],
    skinTypes: ["sensitive", "dry"],
    ingredients: ["Centella Asiatica", "Panthenol", "Madecassoside"],
    rating: 4.4,
    reviewCount: 288,
  },
  {
    name: "Barrier Repair Moisturizer",
    category: "moisturizer",
    price: 999,
    description: "Ceramide-rich moisturizer that repairs the skin barrier and calms redness.",
    imageUrl: "/products/barrier-repair-moisturizer.svg",
    tags: ["redness", "hydration", "texture"],
    skinTypes: ["dry", "sensitive", "normal"],
    ingredients: ["Ceramide NP", "Cholesterol", "Fatty Acids"],
    rating: 4.7,
    reviewCount: 703,
  },
  {
    name: "Oil-Free Gel Moisturizer",
    category: "moisturizer",
    price: 749,
    description: "Lightweight, oil-free gel moisturizer that hydrates without clogging pores.",
    imageUrl: "/products/oil-free-gel-moisturizer.svg",
    tags: ["pores", "hydration"],
    skinTypes: ["oily", "combination"],
    ingredients: ["Hyaluronic Acid", "Green Tea Extract"],
    bestseller: true,
    rating: 4.5,
    reviewCount: 590,
  },
  {
    name: "Retinol Night Cream",
    category: "moisturizer",
    price: 1249,
    description: "Encapsulated retinol night cream that smooths texture and softens fine lines.",
    imageUrl: "/products/retinol-night-cream.svg",
    tags: ["texture", "anti-aging", "spots"],
    skinTypes: ["normal", "combination", "dry"],
    ingredients: ["Encapsulated Retinol 0.3%", "Squalane"],
    rating: 4.6,
    reviewCount: 421,
  },
  {
    name: "Daily Defense SPF 50 Sunscreen",
    category: "sunscreen",
    price: 649,
    description: "Broad-spectrum SPF 50 sunscreen with a weightless, no-white-cast finish.",
    imageUrl: "/products/spf50-sunscreen.svg",
    tags: ["spots", "anti-aging", "redness"],
    skinTypes: ["normal", "oily", "combination", "dry", "sensitive"],
    ingredients: ["Zinc Oxide", "Niacinamide"],
    bestseller: true,
    rating: 4.8,
    reviewCount: 1530,
  },
  {
    name: "Tinted Mineral Sunscreen",
    category: "sunscreen",
    price: 799,
    description: "Mineral SPF 40 with a sheer tint that evens tone while protecting from UV damage.",
    imageUrl: "/products/tinted-mineral-sunscreen.svg",
    tags: ["spots", "brightening"],
    skinTypes: ["sensitive", "normal", "dry"],
    ingredients: ["Zinc Oxide", "Titanium Dioxide", "Iron Oxides"],
    rating: 4.5,
    reviewCount: 366,
  },
  {
    name: "Salicylic Acid Spot Treatment",
    category: "treatment",
    price: 549,
    description: "Targeted overnight spot treatment that clears blemishes fast.",
    imageUrl: "/products/spot-treatment.svg",
    tags: ["acne", "spots", "pores"],
    skinTypes: ["oily", "combination"],
    ingredients: ["Salicylic Acid 2%", "Tea Tree Oil"],
    rating: 4.4,
    reviewCount: 275,
  },
  {
    name: "Pore Refining Clay Mask",
    category: "mask",
    price: 699,
    description: "Kaolin clay mask that draws out impurities and visibly minimizes pores.",
    imageUrl: "/products/clay-mask.svg",
    tags: ["pores", "texture", "acne"],
    skinTypes: ["oily", "combination"],
    ingredients: ["Kaolin Clay", "Bentonite", "Witch Hazel"],
    rating: 4.5,
    reviewCount: 402,
  },
  {
    name: "Overnight Hydration Mask",
    category: "mask",
    price: 899,
    description: "Sleeping mask that floods the skin with moisture overnight for a plump morning glow.",
    imageUrl: "/products/hydration-mask.svg",
    tags: ["hydration", "texture"],
    skinTypes: ["dry", "normal", "sensitive"],
    ingredients: ["Hyaluronic Acid", "Squalane", "Honey Extract"],
    rating: 4.6,
    reviewCount: 318,
  },
  {
    name: "Balancing Toner",
    category: "toner",
    price: 549,
    description: "Alcohol-free toner that balances pH and preps skin for serums and moisturizer.",
    imageUrl: "/products/balancing-toner.svg",
    tags: ["texture", "redness", "hydration"],
    skinTypes: ["normal", "combination", "sensitive"],
    ingredients: ["Witch Hazel", "Chamomile", "Glycerin"],
    rating: 4.3,
    reviewCount: 210,
  },
];

const run = async () => {
  await connectDB();

  await Product.deleteMany({});
  await Product.insertMany(products);
  console.log(`[seed] Inserted ${products.length} products.`);

  const adminEmail = "admin@bluesatchel.com";
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      name: "Blue Satchel Admin",
      email: adminEmail,
      password: "Admin@123",
      role: "admin",
      skinType: "normal",
    });
    console.log(`[seed] Admin user created -> ${adminEmail} / Admin@123`);
  } else {
    console.log("[seed] Admin user already exists.");
  }

  console.log("[seed] Done.");
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
