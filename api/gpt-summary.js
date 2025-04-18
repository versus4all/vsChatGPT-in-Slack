// api/gpt-summary.js

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

module.exports = async (req, res) => {
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

    // 💡 Вместо try/json → читаем как текст и пытаемся распарсить
    const raw = await historyResp.text();
    console.log('[GPT-SUMMARY] Raw Slack response:', raw);

    let history;
    try {
      history = JSON.parse(raw);
    } catch (err) {
      console.error('[GPT-SUMMARY] Error parsing Slack response:', err);
      return;
    }

    if (!history.ok) {
      console.error(`[GPT-SUMMARY] Slack returned error: ${history.error}`);
      return;
    }

    const messages = history.messages.reverse().map(m => m.text).join('\n');
    console.log('[GPT-SUMMARY] Messages fetched, sending to OpenAI...');

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
    console.error('[GPT-SUMMARY] Fatal error:', err);
  }
};
