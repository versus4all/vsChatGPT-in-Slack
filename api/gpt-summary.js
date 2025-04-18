export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

  const { channel_id, user_id, text, thread_ts } = req.body;
  const allowedUserId = "U02982R3A0J";
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (user_id !== allowedUserId) {
    return res.status(200).send("🚫 Access denied.");
  }

  const useThread = text.includes("--thread");
  const match = text.match(/--last (\d+)/);
  const limit = match ? parseInt(match[1], 10) : 20;

  try {
    let messages = [];

    if (useThread && thread_ts) {
      // Собрать сообщения из треда
      const repliesRes = await fetch(`https://slack.com/api/conversations.replies?channel=${channel_id}&ts=${thread_ts}&limit=100`, {
        headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
      });

      const replies = await repliesRes.json();
      if (!replies.ok) throw new Error("Failed to fetch thread replies");

      messages = replies.messages.map((m) => m.text);
    } else {
      // Собрать последние N сообщений из канала
      const historyRes = await fetch(`https://slack.com/api/conversations.history?channel=${channel_id}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
      });

      const history = await historyRes.json();
      if (!history.ok) throw new Error("Failed to fetch channel messages");

      messages = history.messages.reverse().map((m) => m.text);
    }

    const inputText = messages.join("\n\n");

    // GPT prompt: расширенный
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
            content: `You are a technical assistant. Read the Slack messages below and generate a clear, structured and detailed summary with the following sections:

• 🧠 Topic: What was discussed?  
• 👥 Participants: Who wrote what (if names mentioned)?  
• 📋 Key Points / Conclusions  
• ✅ Action Items / Decisions taken  
• 🔐 Credentials mentioned (URLs, passwords, IPs, tokens)

Use formatting and bullet points where appropriate.`,
          },
          {
            role: "user",
            content: inputText,
          },
        ],
      }),
    });

    const data = await gptRes.json();
    const summary = data.choices?.[0]?.message?.content || "⚠️ GPT returned no summary.";

    // Отправим в личку
    const dmRes = await fetch("https://slack.com/api/conversations.open", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify({ users: user_id }),
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

    return res.status(200).send("📬 Summary sent to your DM.");
  } catch (error) {
    console.error("Summary error:", error);
    return res.status(200).send("⚠️ Failed to generate summary.");
  }
}
