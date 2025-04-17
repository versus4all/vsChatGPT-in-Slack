export default async function handler(req, res) {
  if (req.method === 'POST') {
    const prompt = req.body.text;

    if (!prompt) {
      return res.status(200).send("❗ Пожалуйста, добавьте текст после команды `/gpt`.");
    }

    // Заглушка — здесь можно вызвать OpenAI API
    return res.status(200).send(`🤖 Запрос принят: *${prompt}*\n_Ответ скоро появится здесь..._`);
  }

  res.status(405).send('Method Not Allowed');
}
