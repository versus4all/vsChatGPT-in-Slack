// lib/state.js/
const { Redis } = require('@upstash/redis');

// Инициализируем клиент только из этих двух ENV‑переменных:
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

/** Ключ формата "summary:<userId>:<threadTs>" */
function buildKey(userId, threadTs = 'default') {
  return `summary:${userId}:${threadTs}`;
}

module.exports = {
  /** Устанавливаем статус с TTL (scheduled или cancelled) */
  async set(userId, threadTs, value, ttlSeconds = 30) {
    const key = buildKey(userId, threadTs);
    console.log(`[KV] SET ${key} = "${value}" (TTL ${ttlSeconds}s)`);
    await redis.set(key, value, { ex: ttlSeconds });
  },

  /** Получаем статус */
  async get(userId, threadTs) {
    const key = buildKey(userId, threadTs);
    const result = await redis.get(key);
    console.log(`[KV] GET ${key} = "${result}"`);
    return result;
  },

  /** Удаляем ключ */
  async delete(userId, threadTs) {
    const key = buildKey(userId, threadTs);
    console.log(`[KV] DELETE ${key}`);
    await redis.del(key);
  },
};
