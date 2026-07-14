/* Shared GitHub Contents API helpers used by both the product-publish and
   sales-sync/export handlers. */

export const REPO_OWNER = "khaledsaad112008-create";
export const REPO_NAME = "testingshop.pcplugshop";
export const REPO_BRANCH = "main";

export function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function githubHeaders(token, extra) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "pcplug-publish-worker",
    ...extra,
  };
}

export function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function contentsUrl(path) {
  return `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
}

/* Returns the current sha of a file, or null if it doesn't exist yet. */
export async function getFileSha(path, token) {
  const res = await fetch(`${contentsUrl(path)}?ref=${REPO_BRANCH}`, {
    headers: githubHeaders(token),
  });
  if (res.status === 404) return { sha: null, status: res.status };
  if (!res.ok) return { sha: null, status: res.status, error: true };
  const data = await res.json();
  return { sha: data.sha, status: res.status };
}

/* Fetches and JSON-parses a file's raw content, or returns fallback if missing. */
export async function getJsonFile(path, token, fallback) {
  const res = await fetch(`${contentsUrl(path)}?ref=${REPO_BRANCH}`, {
    headers: githubHeaders(token),
  });
  if (res.status === 404) return fallback;
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`);
  const data = await res.json();
  const content = atob(data.content.replace(/\n/g, ""));
  const bytes = Uint8Array.from(content, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/* Creates or updates a file's content (base64) via a single PUT. */
export async function putFile(path, base64Content, message, token, sha) {
  const body = {
    message,
    content: base64Content,
    branch: REPO_BRANCH,
  };
  if (sha) body.sha = sha;
  return fetch(contentsUrl(path), {
    method: "PUT",
    headers: githubHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
}
