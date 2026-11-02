// small helpers shared by the functions

export const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export async function fetchWithTimeout(url, opts = {}, ms = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      ...opts,
      headers: { "User-Agent": UA, Accept: "*/*", ...(opts.headers || {}) },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} from ${new URL(url).hostname}`);
      err.status = res.status;
      throw err;
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// In-memory cache. It only lives as long as the function instance stays warm,
// but that's enough to stop every visitor from hitting the upstream APIs.
// If a refresh fails we keep serving the old value (marked stale) for up to maxStale ms.
const store = new Map();

export async function cached(key, ttlMs, fetcher, maxStaleMs = 24 * 3600 * 1000) {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return { value: hit.value, cached: true, stale: false, fetchedAt: hit.at };
  try {
    const value = await fetcher();
    store.set(key, { value, expires: now + ttlMs, at: now });
    return { value, cached: false, stale: false, fetchedAt: now };
  } catch (err) {
    if (hit && now - hit.at < maxStaleMs) {
      return { value: hit.value, cached: true, stale: true, fetchedAt: hit.at, error: err.message };
    }
    throw err;
  }
}

export function clearCache() {
  store.clear();
}

export function json(body, status = 200, cdnSeconds = 30) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  };
  if (status === 200) {
    headers["Cache-Control"] = "public, max-age=10";
    // Netlify's CDN caches the response, so most requests never reach the function
    headers["Netlify-CDN-Cache-Control"] = `public, s-maxage=${cdnSeconds}, stale-while-revalidate=${cdnSeconds * 2}`;
  } else {
    headers["Cache-Control"] = "no-store";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

// run async tasks with a concurrency limit
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try {
        out[idx] = await fn(items[idx], idx);
      } catch (e) {
        out[idx] = { error: e.message };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export function round(n, d = 2) {
  if (n == null || !Number.isFinite(n)) return null;
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
