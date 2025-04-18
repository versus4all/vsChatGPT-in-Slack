export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send("Method Not Allowed");
  }

  const allowedUserId = "U02982R3A0J"; // 👈 только ты

  if (req.body.user_id !== allowedUserId) {
    return res.status(200).send("🚫 Access denied.");
  }

  return res.status(200).send(
`📘 *GPT Slack Bot Commands*:

🧠 \`/gpt [prompt]\`  
General prompt to GPT-4o. Example:  
\`/gpt Write a short Telegram post about ETH bonuses\`

⚡ \`/gpt --tweet [text]\`  
Generate a short, catchy promotional tweet.

🎯 \`/gpt --banner [topic]\`  
Write banner text (headline + 1-liner CTA).

📄 \`/gpt --article [topic]\`  
Write a ~200-word article or blog post.

🎭 \`/gpt-style [mode]\`  
Set the current GPT style (e.g., copywriter, sarcastic, technical).

💰 \`/gpt-balance\`  
Check your OpenAI API usage and remaining balance.

📖 \`/gpt-help\`  
Show this help menu.

_Only you (the bot owner) can use these commands. Slack ID: ${req.body.user_id}_`
  );
}
