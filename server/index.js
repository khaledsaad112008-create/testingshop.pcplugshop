const express = require("express");
const path = require("path");
const { REPO_ROOT } = require("./lib/dataStore");
const productsRoutes = require("./routes/products");
const salesRoutes = require("./routes/sales");
const cron = require("./lib/cron");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" })); // base64 image uploads can be large

/* Static allowlist — explicit directories only. Never express.static() the
   whole repo root: that would expose server/, worker/, data/, .git,
   node_modules, and package.json as browsable files. */
app.use("/css", express.static(path.join(REPO_ROOT, "css")));
app.use("/js", express.static(path.join(REPO_ROOT, "js")));
app.use("/images", express.static(path.join(REPO_ROOT, "images")));
app.use("/admin", express.static(path.join(REPO_ROOT, "admin"))); // only contains the 4 admin .html files

const TOP_LEVEL_PAGES = ["index.html", "product.html", "cart.html"];
for (const file of TOP_LEVEL_PAGES) {
  app.get(`/${file}`, (req, res) => res.sendFile(path.join(REPO_ROOT, file)));
}
app.get("/", (req, res) => res.sendFile(path.join(REPO_ROOT, "index.html")));

/* API — GET /api/products is the only unauthenticated data route (customers
   browse without Cloudflare Access OTP). Everything else lives under
   /admin/api/*, inheriting the same Access gate that already protects
   /admin/* today. */
app.use("/api/products", productsRoutes.publicRouter);
app.use("/admin/api/products", productsRoutes.adminRouter);
app.use("/admin/api/sales-reports", salesRoutes.reportsRouter);
app.use("/admin/api/sales", salesRoutes.router);

app.use((req, res) => res.status(404).send("Not found"));

app.listen(PORT, () => {
  console.log(`PC PLUG server listening on http://localhost:${PORT}`);
  cron.start();
});

module.exports = app;
