// lib/state.js
const { Redis } = require('@upstash/redis');

// ЧИТАЕМ ТОЧНО ЭТИ две переменные из Vercel:
// UPSTASH_REDIS_REST_URL=https://<твой‑инстанс>.upstash.io
// UPSTASH_REDIS_REST_TOKEN=<твой‑токен>
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/** Собираем ключ */
function buildKey(userId, threadTs = 'default') {
  return `summary:${userId}:${threadTs}`;
}

module.exports = {
  /** Сохраняем статус (scheduled/cancelled) с TTL */
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
