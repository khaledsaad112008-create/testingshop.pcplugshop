/* Commits the admin dashboard's product draft straight to data/products.json
   on main via GitHub's Contents API. */

import { jsonResponse, utf8ToBase64, getFileSha, putFile } from "./github.js";

const FILE_PATH = "data/products.json";

export async function handlePublishProducts(request, env) {
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

  let currentSha;
  try {
    const shaRes = await getFileSha(FILE_PATH, env.GITHUB_TOKEN);
    if (shaRes.error) {
      return jsonResponse(502, { ok: false, error: "auth", detail: `GitHub read failed: ${shaRes.status}` });
    }
    currentSha = shaRes.sha;
  } catch (e) {
    return jsonResponse(502, { ok: false, error: "network", detail: "Could not reach GitHub to read current file" });
  }

  const jsonString = JSON.stringify(products, null, 2);
  let putRes;
  try {
    putRes = await putFile(
      FILE_PATH,
      utf8ToBase64(jsonString),
      `Publish product catalog via admin dashboard (${products.length} products)`,
      env.GITHUB_TOKEN,
      currentSha
    );
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
}
