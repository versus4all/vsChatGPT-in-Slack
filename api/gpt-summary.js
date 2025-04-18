export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

  const { channel_id, user_id, text, thread_ts } = req.body;
  const allowedUserId = "U02982R3A0J"; // ← твой Slack ID
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
      const repliesRes = await fetch(`https://slack.com/api/conversations.replies?channel=${channel_id}&ts=${thread_ts}&limit=100`, {
        headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
      });

      const replies = await repliesRes.json();
      if (!replies.ok || !replies.messages?.length) {
        throw new Error("No messages found in thread.");
      }

      messages = replies.messages.map((m) => m.text);
    } else {
      const historyRes = await fetch(`https://slack.com/api/conversations.history?channel=${channel_id}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
      });

      const history = await historyRes.json();
      if (!history.ok || !history.messages?.length) {
        throw new Error("No messages found in channel.");
      }

      messages = history.messages.reverse().map((m) => m.text);
    }

    const inputText = messages.join("\n\n").trim();
    if (!inputText) {
      return res.status(200).send("⚠️ No usable messages found for summary.");
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
• URL / IP / Passwords / Keys, etc.

Use Slack markdown formatting (bold, bullet points). Keep it clear and actionable.`,
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

    // Открываем личку
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
    console.error("gpt-summary error:", error);
    return res.status(200).send("⚠️ Failed to generate summary.");
  }
}
