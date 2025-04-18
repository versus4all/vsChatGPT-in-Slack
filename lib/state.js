// lib/state.js
const fetch = require('node-fetch');

function getUrl(path) {
  return `${process.env.KV_REST_API_URL}${path}`;
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
  await fetch(getUrl(`/set/${key}`), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ value, _ttl: ttlSeconds }),
  });
}

async function get(userId, threadTs) {
  const key = buildKey(userId, threadTs);
  const res = await fetch(getUrl(`/get/${key}`), {
    headers: getHeaders(),
  });
  const data = await res.json();
  return data.result;
}

async function remove(userId, threadTs) {
  const key = buildKey(userId, threadTs);
  await fetch(getUrl(`/del/${key}`), {
    method: 'POST',
    headers: getHeaders(),
  });
}

module.exports = {
  set,
  get,
  delete: remove,
};
