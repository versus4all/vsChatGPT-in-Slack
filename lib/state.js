// lib/state.js
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

/**
 * Берём только REST‑URL из Upstash KV
 * Переменная в Vercel должна называться exactly:
 *   KV_REST_API_URL=https://<your-instance>.upstash.io
 */
function getBase() {
  const url = process.env.KV_REST_API_URL;
  if (!url) {
    throw new Error('Missing KV_REST_API_URL env var');
  }
  return url.replace(/\/+$/, '');
}

/**
 * И только этот токен нам нужен для записи/чтения:
 *   KV_REST_API_TOKEN=<your-rest-token>
 */
function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function buildKey(userId, threadTs = 'default') {
  return `summary:${userId}:${threadTs}`;
}

/**
 * Сохраняем значение с TTL через query-параметр ?ex=
 */
async function set(userId, threadTs, value, ttlSeconds = 30) {
  const key = buildKey(userId, threadTs);
  const url = `${getBase()}/set/${encodeURIComponent(key)}?ex=${ttlSeconds}`;
  console.log(`[KV] SET url=${url}`);
  console.log(`[KV] SET body={"value":"${value}"}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ value }),
  });
  console.log(`[KV] SET status=${res.status}`);
}

/**
 * Читаем значение
 */
async function get(userId, threadTs) {
  const key = buildKey(userId, threadTs);
  const url = `${getBase()}/get/${encodeURIComponent(key)}`;
  console.log(`[KV] GET url=${url}`);
  const res = await fetch(url, { headers: getHeaders() });
  console.log(`[KV] GET status=${res.status}`);
  const data = await res.json();
  console.log(`[KV] GET response=${JSON.stringify(data)}`);
  return data.result;
}

/**
 * Удаляем ключ
 */
async function remove(userId, threadTs) {
  const key = buildKey(userId, threadTs);
  const url = `${getBase()}/del/${encodeURIComponent(key)}`;
  console.log(`[KV] DELETE url=${url}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
  });
  console.log(`[KV] DELETE status=${res.status}`);
}

module.exports = {
  set,
  get,
  delete: remove,
};
