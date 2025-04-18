const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

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
  console.log(`[KV] SET ${key} = "${value}" (TTL: ${ttlSeconds}s)`);

  // Передаём TTL через query-параметр ?ex=
  const url = getUrl(`/set/${key}?ex=${ttlSeconds}`);

  await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    // тело теперь только с самим значением
    body: JSON.stringify({ value }),
  });
}

async function get(userId, threadTs) {
  const key = buildKey(userId, threadTs);
  const res = await fetch(getUrl(`/get/${key}`), {
    headers: getHeaders(),
  });
  const data = await res.json();
  console.log(`[KV] GET ${key} = "${data.result}"`);
  return data.result;
}

async function remove(userId, threadTs) {
  const key = buildKey(userId, threadTs);
  console.log(`[KV] DELETE ${key}`);
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
