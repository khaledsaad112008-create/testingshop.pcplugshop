const express = require("express");
const { readProducts, writeProducts } = require("../lib/dataStore");
const gitSync = require("../lib/git");

function generateId() {
  return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function sanitizeProduct(data) {
  return {
    name: String(data.name || "").trim(),
    price: Number(data.price) || 0,
    category: String(data.category || "Uncategorized").trim(),
    stock: Number(data.stock) || 0,
    image: data.image || "https://picsum.photos/seed/plug-default/500/400",
    description: String(data.description || "").trim(),
  };
}

/* GET /api/products — public, no auth. Used by both the storefront and the
   admin dashboard (the catalog itself isn't sensitive data). */
const publicRouter = express.Router();
publicRouter.get("/", async (req, res) => {
  try {
    res.json(await readProducts());
  } catch (e) {
    res.status(500).json({ ok: false, error: "read_failed", detail: e.message });
  }
});

/* /admin/api/products — write actions, behind Cloudflare Access same as
   every other /admin/* route. */
const adminRouter = express.Router();

adminRouter.post("/", async (req, res) => {
  const data = sanitizeProduct(req.body || {});
  if (!data.name || !data.category) {
    return res.status(400).json({ ok: false, error: "invalid_payload", detail: "name and category are required" });
  }
  const products = await readProducts();
  const product = { id: generateId(), ...data };
  products.push(product);
  await writeProducts(products);
  gitSync.syncPaths(["data/products.json"], `Add product: ${product.name}`);
  res.status(201).json(product);
});

adminRouter.put("/:id", async (req, res) => {
  const products = await readProducts();
  const idx = products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: "not_found" });

  products[idx] = { ...products[idx], ...req.body, id: products[idx].id };
  await writeProducts(products);
  gitSync.syncPaths(["data/products.json"], `Update product: ${products[idx].name}`);
  res.json(products[idx]);
});

adminRouter.delete("/:id", async (req, res) => {
  const products = await readProducts();
  const product = products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ ok: false, error: "not_found" });

  const remaining = products.filter((p) => p.id !== req.params.id);
  await writeProducts(remaining);
  gitSync.syncPaths(["data/products.json"], `Delete product: ${product.name}`);
  res.json({ ok: true });
});

module.exports = { publicRouter, adminRouter };
