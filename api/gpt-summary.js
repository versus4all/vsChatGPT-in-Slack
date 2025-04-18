// api/gpt-summary.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const body = req.body;

  const commandText = body.text || '';
  const userId = body.user_id;
  const channelId = body.channel_id;
  const threadTs = body.thread_ts || null;

  // Параметр --last N
  const match = commandText.match(/--last (\d+)/);
  const numMessages = match ? parseInt(match[1], 10) : 10;

  console.log(`[GPT-SUMMARY] Request from user=${userId}, channel=${channelId}, threadTs=${threadTs}, last=${numMessages}`);

  try {
    // 1. Получаем последние N сообщений из канала (или треда)
    const historyResp = await fetch('https://slack.com/api/conversations.history', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        limit: numMessages,
        inclusive: true,
        ...(threadTs ? { oldest: threadTs } : {}),
      }),
    });

    const history = await historyResp.json();
    if (!history.ok) throw new Error(`Failed to fetch messages: ${history.error}`);

    const messages = history.messages.reverse().map(m => m.text).join('\n');

    // 2. Отправляем в GPT
    const prompt = `Summarize the following Slack discussion:\n\n${messages}`;
    const gptResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const gptData = await gptResp.json();
    const summary = gptData.choices?.[0]?.message?.content || '[No summary returned]';

    // 3. Отправляем результат в Direct Message
    const dmResp = await fetch('https://slack.com/api/conversations.open', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ users: userId }),
    });

    const dm = await dmResp.json();
    if (!dm.ok) throw new Error(`Failed to open DM: ${dm.error}`);

    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: dm.channel.id,
        text: `🧠 Here’s your summary:\n\n${summary}`,
      }),
    });

    res.status(200).send();
  } catch (err) {
    console.error('[GPT-SUMMARY] Error:', err);
    res.status(500).send('Something went wrong while generating the summary.');
  }
};
