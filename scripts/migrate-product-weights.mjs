import mongoose from "mongoose";

const productWeights = {
  "TOY-BUB-001": 120,
  "TOY-BUB-002": 95,
  "TOY-VEH-001": 450,
  "TOY-VEH-002": 220,
  "TOY-VEH-003": 180,
  "TOY-VEH-004": 140,
  "TOY-FIG-001": 280,
  "HOM-CLK-001": 260,
  "TOY-GAM-001": 350,
  "PRT-EFF-001": 450,
  "PRT-EFF-002": 250,
  "PRT-EFF-003": 160,
  "PRT-HAT-001": 140,
  "PRT-POM-001": 80,
  "PRT-PMP-001": 1100,
  "HOM-DIN-001": 2800,
  "HOM-DIN-002": 1850,
  "HOM-STR-001": 12500,
  "HOM-FUR-001": 3200,
  "HOM-LAD-001": 5400,
  "STN-SET-001": 210,
  "STN-SET-002": 190,
  "STN-SET-003": 200,
  "ELC-FAN-001": 320,
  "ELC-FAN-002": 220,
  "FSH-JWL-001": 65,
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const collection = mongoose.connection.db.collection("products");

  console.log("Updating products with weights in grams...");
  for (const [sku, weight] of Object.entries(productWeights)) {
    const res = await collection.updateOne(
      { sku },
      { $set: { weight } }
    );
    console.log(`- ${sku}: set weight to ${weight}g (matched: ${res.matchedCount}, modified: ${res.modifiedCount})`);
  }

  // Any remaining products without weight
  const fallback = await collection.updateMany(
    { $or: [{ weight: { $exists: false } }, { weight: null }] },
    { $set: { weight: 200 } }
  );
  if (fallback.modifiedCount > 0) {
    console.log(`Set fallback weight for ${fallback.modifiedCount} other products.`);
  }

  const all = await collection.find({}, { projection: { sku: 1, name: 1, weight: 1 } }).toArray();
  console.log(`\nVerification: Total products in DB: ${all.length}`);
  const missing = all.filter((p) => p.weight === undefined || p.weight === null);
  console.log(`Products without weight: ${missing.length}`);
  if (missing.length === 0) {
    console.log("SUCCESS: All products now have weight connected in the database!");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
