/* Sales log sync (data/sales.json) + automatic monthly Excel export
   (sales-reports/YYYY-MM.xlsx), both via GitHub's Contents API. */

import * as XLSX from "xlsx";
import { jsonResponse, utf8ToBase64, getFileSha, getJsonFile, putFile } from "./github.js";

const SALES_FILE_PATH = "data/sales.json";
const REPORTS_DIR = "sales-reports";

export async function handleSyncSales(request, env) {
  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "invalid_payload", detail: "POST only" });
  }

  let sales;
  try {
    const body = await request.json();
    sales = body.sales;
  } catch (e) {
    return jsonResponse(400, { ok: false, error: "invalid_payload", detail: "Malformed JSON body" });
  }
  if (!Array.isArray(sales)) {
    return jsonResponse(400, { ok: false, error: "invalid_payload", detail: "sales must be an array" });
  }

  let currentSha;
  try {
    const shaRes = await getFileSha(SALES_FILE_PATH, env.GITHUB_TOKEN);
    if (shaRes.error) {
      return jsonResponse(502, { ok: false, error: "auth", detail: `GitHub read failed: ${shaRes.status}` });
    }
    currentSha = shaRes.sha;
  } catch (e) {
    return jsonResponse(502, { ok: false, error: "network", detail: "Could not reach GitHub to read current file" });
  }

  const jsonString = JSON.stringify(sales, null, 2);
  let putRes;
  try {
    putRes = await putFile(
      SALES_FILE_PATH,
      utf8ToBase64(jsonString),
      `Sync sales log via admin dashboard (${sales.length} entries)`,
      env.GITHUB_TOKEN,
      currentSha
    );
  } catch (e) {
    return jsonResponse(502, { ok: false, error: "network", detail: "Could not reach GitHub to write file" });
  }

  if (putRes.status === 409) {
    return jsonResponse(409, { ok: false, error: "conflict", detail: "sales.json changed since it was last loaded" });
  }
  if (putRes.status === 401 || putRes.status === 403) {
    return jsonResponse(502, { ok: false, error: "auth", detail: "GitHub token rejected on write" });
  }
  if (!putRes.ok) {
    const detail = await putRes.text().catch(() => "");
    return jsonResponse(502, { ok: false, error: "network", detail: `GitHub write failed: ${putRes.status} ${detail}` });
  }

  const putData = await putRes.json();
  return jsonResponse(200, {
    ok: true,
    count: sales.length,
    commitSha: putData.commit && putData.commit.sha,
  });
}

function buildSalesWorkbook(sales, sheetName) {
  const rows = sales.map((s) => ({
    Date: s.date,
    Product: s.name,
    Category: s.category,
    Quantity: s.quantity,
    "Unit Price (QAR)": s.unitPrice,
    "Total (QAR)": s.total,
    Note: s.note || "",
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 12 }, { wch: 32 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 30 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return workbook;
}

function previousMonthKey(now) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/* Core export: reads the synced sales log, pulls out the given month's
   entries, and commits an .xlsx report for that month into sales-reports/.
   Shared by the cron trigger (previous month, automatic) and the admin's
   manual "force export" button (any month, on demand). */
async function exportMonthReport(env, monthKey) {
  const sales = await getJsonFile(SALES_FILE_PATH, env.GITHUB_TOKEN, []);
  const monthSales = sales
    .filter((s) => (s.date || "").slice(0, 7) === monthKey)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!monthSales.length) return { ok: true, skipped: true, monthKey };

  const workbook = buildSalesWorkbook(monthSales, monthKey);
  const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

  const reportPath = `${REPORTS_DIR}/${monthKey}.xlsx`;
  const shaRes = await getFileSha(reportPath, env.GITHUB_TOKEN);
  const putRes = await putFile(
    reportPath,
    base64,
    `Generate ${monthKey} sales report (${monthSales.length} entries)`,
    env.GITHUB_TOKEN,
    shaRes.sha
  );

  if (!putRes.ok) {
    const detail = await putRes.text().catch(() => "");
    return { ok: false, monthKey, detail: `GitHub write failed: ${putRes.status} ${detail}` };
  }

  return { ok: true, monthKey, count: monthSales.length };
}

/* Runs on the Worker's cron trigger (1st of every month) — fully automatic,
   no admin visit needed, as long as sales were synced to GitHub via "Sync to
   GitHub" at some point during the month. */
export async function handleMonthlyExport(env, when) {
  const now = when || new Date();
  return exportMonthReport(env, previousMonthKey(now));
}

/* Admin-triggered equivalent — lets the Sales page force-generate a report
   for any month right now, instead of waiting for the 1st. */
export async function handleForceExport(request, env) {
  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "invalid_payload", detail: "POST only" });
  }

  let monthKey;
  try {
    const body = await request.json();
    monthKey = body.monthKey;
  } catch (e) {
    return jsonResponse(400, { ok: false, error: "invalid_payload", detail: "Malformed JSON body" });
  }
  if (!/^\d{4}-\d{2}$/.test(monthKey || "")) {
    return jsonResponse(400, { ok: false, error: "invalid_payload", detail: "monthKey must be YYYY-MM" });
  }

  try {
    const result = await exportMonthReport(env, monthKey);
    if (!result.ok) return jsonResponse(502, { ok: false, error: "network", detail: result.detail });
    return jsonResponse(200, result);
  } catch (e) {
    return jsonResponse(502, { ok: false, error: "network", detail: "Could not reach GitHub" });
  }
}
