// lib/state.js
const { Redis } = require('@upstash/redis');

// Берём эти две переменные из Vercel:
// KV_REST_API_URL   — https://<your-instance>.upstash.io
// KV_REST_API_TOKEN — REST API token
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

/** Формирует ключ вида "summary:USER:THREAD" */
function buildKey(userId, threadTs = 'default') {
  return `summary:${userId}:${threadTs}`;
}

module.exports = {
  /** Запланировать задачу (status = 'scheduled' или 'cancelled') с TTL */
  async set(userId, threadTs, value, ttlSeconds = 30) {
    const key = buildKey(userId, threadTs);
    console.log(`[KV] SET ${key} = "${value}" (TTL ${ttlSeconds}s)`);
    await redis.set(key, value, { ex: ttlSeconds });
  },

  /** Проверить статус */
  async get(userId, threadTs) {
    const key = buildKey(userId, threadTs);
    const result = await redis.get(key);
    console.log(`[KV] GET ${key} = "${result}"`);
    return result;
  },

  /** Удалить ключ */
  async delete(userId, threadTs) {
    const key = buildKey(userId, threadTs);
    console.log(`[KV] DELETE ${key}`);
    await redis.del(key);
  },
};
