/* Monthly sales report automation — replaces the old Cloudflare Worker Cron
   Trigger. Deliberately NOT an exact-time scheduler: a `setInterval` that
   only fires at one specific hour is fragile against sleep/reboot (miss that
   one window and the month is silently skipped forever). Instead this is an
   idempotent catch-up check: on startup, and periodically after, if it's
   past the 1st of the month and last month's report file doesn't exist yet,
   generate it. The file's own existence is the idempotency marker — this
   self-heals through any gap in uptime, no separate state to track. */

const gitSync = require("./git");
const { reportExists, generateMonthReport } = require("./excel");

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

function previousMonthKey(now) {
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function checkAndCatchUp() {
  const monthKey = previousMonthKey(new Date());
  if (await reportExists(monthKey)) return;

  try {
    const result = await generateMonthReport(monthKey);
    if (result.skipped) return;
    console.log(`[cron] generated sales-reports/${monthKey}.xlsx (${result.count} entries)`);
    gitSync.syncPaths([`sales-reports/${monthKey}.xlsx`], `Auto-generate ${monthKey} sales report (${result.count} entries)`);
  } catch (e) {
    console.error(`[cron] failed to generate report for ${monthKey}:`, e.message);
  }
}

function start() {
  checkAndCatchUp();
  setInterval(checkAndCatchUp, CHECK_INTERVAL_MS);
}

module.exports = { start, checkAndCatchUp, previousMonthKey };
