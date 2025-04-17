export default async function handler(req, res) {
  if (req.method === 'POST') {
    const prompt = req.body.text;
    const userId = req.body.user_id;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    const allowedUserId = "U02982R3A0J"; // your Slack user ID

    if (userId !== allowedUserId) {
      return res.status(200).send("🚫 Sorry, this command is restricted to the bot owner.");
    }

    if (!prompt) {
      return res.status(200).send("⚠️ Please provide a prompt after the `/gpt` command.");
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content;

      if (!answer) return res.status(200).send("⚠️ GPT returned no answer.");
      return res.status(200).send(answer);
    } catch (err) {
      console.error("GPT error:", err);
      return res.status(200).send("⚠️ Failed to get a response from GPT.");
    }
  }

  res.status(405).send("Method Not Allowed");
}
