// lib/state.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

function normalizeBase() {
  // Берём ту переменную, что у тебя в Vercel настроена
  const base = process.env.KV_URL || process.env.KV_REST_API_URL;
  return base.replace(/\/+$/, '');
}

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function buildKey(userId, threadTs = 'default') {
  return `summary:${userId}:${threadTs}`;
}

async function set(userId, threadTs, value, ttlSeconds = 30) {
  const key = buildKey(userId, threadTs);
  const url = `${normalizeBase()}/set/${encodeURIComponent(key)}?ex=${ttlSeconds}`;
  console.log(`[KV DEBUG] SET url=${url}`);
  console.log(`[KV DEBUG] SET body={"value":"${value}"}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ value }),
  });
  console.log(`[KV DEBUG] SET status=${res.status}`);
}

async function get(userId, threadTs) {
  const key = buildKey(userId, threadTs);
  const url = `${normalizeBase()}/get/${encodeURIComponent(key)}`;
  console.log(`[KV DEBUG] GET url=${url}`);
  const res = await fetch(url, { headers: getHeaders() });
  console.log(`[KV DEBUG] GET status=${res.status}`);
  const data = await res.json();
  console.log(`[KV DEBUG] GET response=${JSON.stringify(data)}`);
  return data.result;
}

async function remove(userId, threadTs) {
  const key = buildKey(userId, threadTs);
  const url = `${normalizeBase()}/del/${encodeURIComponent(key)}`;
  console.log(`[KV DEBUG] DELETE url=${url}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
  });
  console.log(`[KV DEBUG] DELETE status=${res.status}`);
}

module.exports = { set, get, delete: remove };
