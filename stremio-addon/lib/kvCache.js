/**
 * KV cache — Upstash Redis over REST.
 *
 * Requires two env vars (auto-injected by Vercel's Upstash integration):
 *   UPSTASH_REDIS_REST_URL   — e.g. https://us1-xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN — bearer token
 *
 * If either is missing, all functions degrade to no-ops so the addon
 * still works without any external services.
 */

// Node 14/16 don't have global fetch; node-fetch is already a project dep.
const fetch = globalThis.fetch || require("node-fetch");

const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL   || "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const CONFIGURED    = !!(UPSTASH_URL && UPSTASH_TOKEN);

/**
 * Execute a single Upstash REST command.
 * @param {string[]} args — Redis command tokens, e.g. ["GET", "mykey"]
 * @returns {Promise<any>} — the `result` field from Upstash, or null on error.
 */
async function upstashCmd(args) {
  try {
    const res = await fetch(UPSTASH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.result ?? null;
  } catch {
    return null;
  }
}

/**
 * Retrieve a cached value.
 * @param {string} key
 * @returns {Promise<any|null>} — parsed JSON value, or null if missing/error.
 */
async function kvGet(key) {
  if (!CONFIGURED) return null;
  const raw = await upstashCmd(["GET", key]);
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    // Value wasn't valid JSON — return the raw string (handles "__null__" etc.)
    return raw;
  }
}

/**
 * Store a value with a TTL.
 * @param {string} key
 * @param {any}    value      — will be JSON-stringified.
 * @param {number} ttlSeconds — Redis EX value.
 */
async function kvSet(key, value, ttlSeconds) {
  if (!CONFIGURED) return;
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  await upstashCmd(["SET", key, serialized, "EX", ttlSeconds]);
}

/**
 * Whether the KV backend is configured and reachable.
 */
function kvAvailable() {
  return CONFIGURED;
}

module.exports = { kvGet, kvSet, kvAvailable };
