// api/test-redis.js
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async (req, res) => {
  try {
    const pong = await redis.ping();
    res.status(200).json({ status: 'ok', pong });
  } catch (err) {
    console.error('TEST-REDIS ERROR:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};
