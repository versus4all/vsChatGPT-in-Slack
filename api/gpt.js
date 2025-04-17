export default async function handler(req, res) {
  if (req.method === 'POST') {
    const prompt = req.body.text;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!prompt) {
      return res.status(200).send("❗ Пожалуйста, добавьте текст после команды `/gpt`.");
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
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      const data = await response.json();

      // 👇 Добавим лог в консоль, чтоб видеть что вернул OpenAI
      console.log("OpenAI response:", JSON.stringify(data, null, 2));

      const answer = data.choices?.[0]?.message?.content;

      if (!answer) {
        return res.status(200).send("⚠️ GPT не вернул ответа.");
      }

      return res.status(200).send(answer);
    } catch (err) {
      console.error("GPT error:", err);
      return res.status(200).send("⚠️ Не удалось получить ответ от GPT.");
    }
  }

  res.status(405).send("Method Not Allowed");
}
