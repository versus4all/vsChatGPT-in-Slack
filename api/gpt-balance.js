export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send("Method Not Allowed");
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const allowedUserId = "U02982R3A0J"; // 👈 только ты

  if (req.body.user_id !== allowedUserId) {
    return res.status(200).send("🚫 Access denied.");
  }

  try {
    // Получим usage info
    const usageRes = await fetch("https://api.openai.com/dashboard/billing/usage", {
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    });
    const usage = await usageRes.json();

    // Получим лимит info
    const limitRes = await fetch("https://api.openai.com/dashboard/billing/subscription", {
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    });
    const limit = await limitRes.json();

    const used = (usage.total_usage / 100).toFixed(2); // в долларах
    const total = (limit.hard_limit_usd).toFixed(2);
    const remaining = (total - used).toFixed(2);

    return res.status(200).send(
      `💰 *OpenAI balance info:*\nUsed: $${used} / $${total}\nRemaining: *$${remaining}*`
    );
  } catch (error) {
    console.error("Balance check error:", error);
    return res.status(200).send("⚠️ Failed to check balance.");
  }
}
