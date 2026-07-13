/* Cloudflare Worker — commits the admin dashboard's product draft straight to
   data/products.json on main via GitHub's Contents API. GITHUB_TOKEN is a
   wrangler secret (never in this file, never sent to the browser). The real
   auth boundary is the Cloudflare Access policy on this route, not this code. */

const REPO_OWNER = "khaledsaad112008-create";
const REPO_NAME = "testingshop.pcplugshop";
const REPO_BRANCH = "main";
const FILE_PATH = "data/products.json";

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function githubHeaders(token, extra) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "pcplug-publish-worker",
    ...extra,
  };
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return jsonResponse(405, { ok: false, error: "invalid_payload", detail: "POST only" });
    }

    let products;
    try {
      const body = await request.json();
      products = body.products;
    } catch (e) {
      return jsonResponse(400, { ok: false, error: "invalid_payload", detail: "Malformed JSON body" });
    }
    if (!Array.isArray(products) || products.length === 0) {
      return jsonResponse(400, { ok: false, error: "invalid_payload", detail: "products must be a non-empty array" });
    }

    const contentsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

    let currentSha;
    try {
      const getRes = await fetch(`${contentsUrl}?ref=${REPO_BRANCH}`, {
        headers: githubHeaders(env.GITHUB_TOKEN),
      });
      if (getRes.status === 401 || getRes.status === 403) {
        return jsonResponse(502, { ok: false, error: "auth", detail: "GitHub token rejected on read" });
      }
      if (!getRes.ok) {
        return jsonResponse(502, { ok: false, error: "network", detail: `GitHub read failed: ${getRes.status}` });
      }
      const getData = await getRes.json();
      currentSha = getData.sha;
    } catch (e) {
      return jsonResponse(502, { ok: false, error: "network", detail: "Could not reach GitHub to read current file" });
    }

    const jsonString = JSON.stringify(products, null, 2);
    let putRes;
    try {
      putRes = await fetch(contentsUrl, {
        method: "PUT",
        headers: githubHeaders(env.GITHUB_TOKEN, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          message: `Publish product catalog via admin dashboard (${products.length} products)`,
          content: utf8ToBase64(jsonString),
          sha: currentSha,
          branch: REPO_BRANCH,
        }),
      });
    } catch (e) {
      return jsonResponse(502, { ok: false, error: "network", detail: "Could not reach GitHub to write file" });
    }

    if (putRes.status === 409) {
      return jsonResponse(409, { ok: false, error: "conflict", detail: "products.json changed since it was last loaded" });
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
      count: products.length,
      commitSha: putData.commit && putData.commit.sha,
    });
  },
};
