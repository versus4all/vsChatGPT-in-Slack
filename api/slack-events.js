export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { type, challenge, event } = req.body;

    // ✅ Slack verification
    if (type === 'url_verification') {
      return res.status(200).json({ challenge });
    }

    // ✅ Обработка @ChatGPT упоминания
    if (event?.type === 'app_mention') {
      const { text, user, channel, thread_ts } = event;

      // 🔐 Только ты (можно убрать, если разрешишь всем)
      if (user !== "U02982R3A0J") {
        return res.status(200).end();
      }

      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

      // Удалим @упоминание из текста
      const cleaned = text.replace(/<@[^>]+>\s*/, '').trim();

      try {
        // Отправим запрос в GPT
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
                content: "You are a helpful assistant in a Slack workspace. Provide clear, helpful, and professional responses.",
              },
              {
                role: "user",
                content: cleaned,
              },
            ],
          }),
        });

        const data = await gptRes.json();
        const answer = data.choices?.[0]?.message?.content || "⚠️ GPT returned no response.";

        // Отправим ответ обратно в тред
        await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
          },
          body: JSON.stringify({
            channel,
            text: answer,
            thread_ts: thread_ts || event.ts,
          }),
        });

        return res.status(200).end();
      } catch (error) {
        console.error("App mention error:", error);
        return res.status(200).send("⚠️ Failed to handle @mention.");
      }
    }

    return res.status(200).end(); // другие события — просто подтверждаем
  }

  res.setHeader('Allow', 'POST');
  res.status(405).end('Method Not Allowed');
}
