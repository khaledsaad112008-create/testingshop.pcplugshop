/* Reads/writes the JSON "database" files (data/products.json, data/sales.json)
   directly on local disk. Small dataset, so no real DB engine — just atomic
   writes (temp file + rename) and a per-file serialized queue so two
   near-simultaneous admin requests can't corrupt a file. */

const fs = require("fs/promises");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..", "..");
const PRODUCTS_PATH = path.join(REPO_ROOT, "data", "products.json");
const SALES_PATH = path.join(REPO_ROOT, "data", "sales.json");

const writeQueues = new Map();

function enqueue(key, task) {
  const prev = writeQueues.get(key) || Promise.resolve();
  const next = prev.then(task, task).finally(() => {
    if (writeQueues.get(key) === next) writeQueues.delete(key);
  });
  writeQueues.set(key, next);
  return next;
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === "ENOENT") return fallback;
    throw e;
  }
}

async function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmpPath = path.join(dir, `.${path.basename(filePath)}.tmp-${process.pid}-${Date.now()}`);
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmpPath, filePath);
}

async function writeFileAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmpPath = path.join(dir, `.${path.basename(filePath)}.tmp-${process.pid}-${Date.now()}`);
  await fs.writeFile(tmpPath, data);
  await fs.rename(tmpPath, filePath);
}

function readProducts() {
  return readJson(PRODUCTS_PATH, []);
}

function writeProducts(products) {
  return enqueue(PRODUCTS_PATH, () => writeJsonAtomic(PRODUCTS_PATH, products));
}

function readSales() {
  return readJson(SALES_PATH, []);
}

function writeSales(sales) {
  return enqueue(SALES_PATH, () => writeJsonAtomic(SALES_PATH, sales));
}

module.exports = {
  REPO_ROOT,
  PRODUCTS_PATH,
  SALES_PATH,
  readProducts,
  writeProducts,
  readSales,
  writeSales,
  writeFileAtomic,
  enqueue,
};
