export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

  const { channel_id, user_id } = req.body;
  const allowedUserId = "U02982R3A0J";
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (user_id !== allowedUserId) {
    return res.status(200).send("🚫 Access denied.");
  }

  try {
    // Получим последние 20 сообщений из канала
    const historyRes = await fetch(`https://slack.com/api/conversations.history?channel=${channel_id}&limit=20`, {
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
    });
    const history = await historyRes.json();

    if (!history.ok) throw new Error("Slack history fetch failed.");

    const messages = history.messages
      .reverse()
      .map((m) => m.text)
      .join("\n\n");

    // Отправим в GPT
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a technical assistant. Summarize the Slack discussion below: extract key topic, action points, credentials (URLs, IPs, tokens, ports, usernames), and who said what. Make it clear and structured.",
          },
          {
            role: "user",
            content: messages,
          },
        ],
      }),
    });

    const data = await gptRes.json();
    const summary = data.choices?.[0]?.message?.content;

    return res.status(200).send(summary || "⚠️ GPT returned no summary.");
  } catch (error) {
    console.error("Summary error:", error);
    return res.status(200).send("⚠️ Failed to generate summary.");
  }
}
