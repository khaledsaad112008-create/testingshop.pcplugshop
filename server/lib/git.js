/* Auto-commits data changes to the GitHub repo as a backup/history layer —
   the local files on disk are the live source of truth, git is not on the
   critical path for a request to succeed. Every call is queued and run
   serially (one git operation at a time, avoids concurrent .git/index.lock
   collisions) and never throws past its own boundary — a failed push just
   gets logged, since the local write already succeeded regardless. */

const { execFile } = require("child_process");
const { REPO_ROOT } = require("./dataStore");

function git(args) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd: REPO_ROOT }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

let queue = Promise.resolve();

/* Stages the given repo-relative paths, commits, and pushes to main.
   Serialized against any other in-flight sync. Resolves either way (logs
   internally on failure) so callers can fire-and-forget safely. */
function syncPaths(paths, message) {
  const task = async () => {
    try {
      await git(["add", "--", ...paths]);

      try {
        await git(["commit", "-m", message]);
      } catch (e) {
        const output = `${e.stdout || ""}${e.stderr || ""}`;
        if (/nothing to commit|no changes added to commit/i.test(output)) {
          return; // no actual changes to sync — not an error
        }
        throw e;
      }

      try {
        await git(["push", "origin", "main"]);
      } catch (e) {
        const rejected = /rejected|non-fast-forward|fetch first/i.test(e.stderr || "");
        if (!rejected) throw e;
        await git(["pull", "--rebase", "--autostash", "origin", "main"]);
        await git(["push", "origin", "main"]);
      }

      console.log(`[git] synced: ${message}`);
    } catch (e) {
      console.error(`[git] sync failed (local write already succeeded, will retry on next change): ${message}`, e.stderr || e.message);
    }
  };

  queue = queue.then(task, task);
  return queue;
}

module.exports = { syncPaths };
