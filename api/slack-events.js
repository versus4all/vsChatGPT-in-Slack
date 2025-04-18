export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

  const { type, challenge, event } = req.body;

  // Проверка Slack
  if (type === 'url_verification') {
    return res.status(200).json({ challenge });
  }

  // Обработка @упоминаний
  if (event?.type === 'app_mention') {
    const { text, user, channel, thread_ts } = event;

    const allowedUserId = "U02982R3A0J";
    const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (user !== allowedUserId) return res.status(200).end();

    // Удалим @упоминание
    const cleaned = text.replace(/<@[^>]+>\s*/, '').toLowerCase();

    // Разбор запроса
    const isThread = /обзор.*треда|summarize.*thread/.test(cleaned);
    const lastMatch = cleaned.match(/(?:обзор|summarize).*?(\d{1,3})/);
    const limit = lastMatch ? parseInt(lastMatch[1], 10) : 20;

    try {
      let messages = [];

      if (isThread && thread_ts) {
        const replies = await fetch(`https://slack.com/api/conversations.replies?channel=${channel}&ts=${thread_ts}&limit=100`, {
          headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
        }).then(res => res.json());

        messages = replies.messages?.map(m => m.text) || [];
      } else {
        const history = await fetch(`https://slack.com/api/conversations.history?channel=${channel}&limit=${limit}`, {
          headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
        }).then(res => res.json());

        messages = history.messages?.reverse().map(m => m.text) || [];
      }

      const inputText = messages.join("\n\n").trim();
      if (!inputText) {
        return res.status(200).end();
      }

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
              content: `You're an expert Slack assistant. Summarize the messages in a clean, professional format like this:

*🧠 Topic:* ...  
*👥 Participants:* ...  
*📋 Key Points:*  
• ...  
• ...  
*✅ Action Items:*  
• ...  
• ...  
*🔐 Credentials Mentioned:*  
• IPs / URLs / tokens / passwords

Use Slack markdown formatting.`,
            },
            {
              role: "user",
              content: inputText,
            },
          ],
        }),
      }).then(res => res.json());

      const summary = gptRes.choices?.[0]?.message?.content || "⚠️ GPT returned no summary.";

      // Отправим в личку
      const dmRes = await fetch("https://slack.com/api/conversations.open", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        },
        body: JSON.stringify({ users: user }),
      });

      const dm = await dmRes.json();
      const dmChannel = dm.channel?.id;

      if (!dmChannel) throw new Error("Failed to open DM channel.");

      await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        },
        body: JSON.stringify({
          channel: dmChannel,
          text: summary,
        }),
      });

      return res.status(200).end();
    } catch (err) {
      console.error("Auto-summary error:", err);
      return res.status(200).send("⚠️ Failed to auto-summarize.");
    }
  }

  res.status(200).end();
}
