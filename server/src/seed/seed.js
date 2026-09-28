import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import mongoose from "mongoose";
import productCatalog from "./productCatalog.js";
import houseProducts from "./houseProducts.js";

const products = [...houseProducts, ...productCatalog];

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
