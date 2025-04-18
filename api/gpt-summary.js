// api/gpt-summary.js

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = async (req, res) => {
  // 1. Отвечаем Slack, чтобы избежать operation_timeout
  res.status(200).send();
  console.log('[GPT-SUMMARY] Slack response sent, starting processing...');

  const body = req.body;

  const commandText = body.text || '';
  const userId = body.user_id;
  const channelId = body.channel_id;
  const threadTs = body.thread_ts || null;

  const match = commandText.match(/--last (\d+)/);
  const numMessages = match ? parseInt(match[1], 10) : 10;

  console.log(`[GPT-SUMMARY] Request from user=${userId}, channel=${channelId}, threadTs=${threadTs}, last=${numMessages}`);

  try {
    // 2. Получаем последние N сообщений из Slack
    console.log('[GPT-SUMMARY] Fetching conversation history...');
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

try {
  const history = await historyResp.json();
  console.log('[GPT-SUMMARY] Slack history response:', JSON.stringify(history, null, 2));

  if (!history.ok) throw new Error(`Failed to fetch messages: ${history.error}`);

  const messages = history.messages.reverse().map(m => m.text).join('\n');
  console.log('[GPT-SUMMARY] Messages fetched, sending to OpenAI...');
  
  // продолжение...
} catch (err) {
  const raw = await historyResp.text?.();
  console.error('[GPT-SUMMARY] Error parsing Slack response:', err);
  if (raw) {
    console.error('[GPT-SUMMARY] Raw Slack response:', raw);
  }
  return;
}


    const messages = history.messages.reverse().map(m => m.text).join('\n');
    console.log('[GPT-SUMMARY] Messages fetched, sending to OpenAI...');

    // 3. Отправляем в GPT
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
    console.log('[GPT-SUMMARY] GPT responded, sending summary via DM...');

    // 4. Открываем личку и отправляем результат пользователю
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
        text: `🧠 *Summary:*\n\n${summary}`,
      }),
    });

    console.log(`[GPT-SUMMARY] Summary sent to user=${userId}`);
  } catch (err) {
    console.error('[GPT-SUMMARY] Error:', err);
  }
};
