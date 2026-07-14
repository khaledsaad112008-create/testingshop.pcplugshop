/* Cloudflare Worker entry point — routes admin API calls and the monthly
   cron trigger. GITHUB_TOKEN is a wrangler secret (never in this repo, never
   sent to the browser). The real auth boundary is the Cloudflare Access
   policy in front of these routes, not this code. */

import { jsonResponse } from "./github.js";
import { handlePublishProducts } from "./publish.js";
import { handleSyncSales, handleMonthlyExport, handleForceExport } from "./sales.js";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/admin/api/publish") {
      return handlePublishProducts(request, env);
    }
    if (pathname === "/admin/api/sales/sync") {
      return handleSyncSales(request, env);
    }
    if (pathname === "/admin/api/sales/export") {
      return handleForceExport(request, env);
    }
    return jsonResponse(404, { ok: false, error: "not_found" });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleMonthlyExport(env));
  },
};
