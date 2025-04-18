// api/gpt-summary.js

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

module.exports = async (req, res) => {
  res.status(200).send();
  console.log('✅ [GPT] Slack acknowledged request, processing begins.');

  const body = req.body;

  const commandText = body.text || '';
  const userId = body.user_id;
  const channelId = body.channel_id;
  const threadTs = body.thread_ts || null;

  const match = commandText.match(/--last (\d+)/);
  const numMessages = match ? parseInt(match[1], 10) : 10;

  console.log(`ℹ️ [GPT] Params: user=${userId}, channel=${channelId}, threadTs=${threadTs}, last=${numMessages}`);

  try {
    console.log('📡 [GPT] Sending fetch to Slack conversations.history...');

    let historyResp;
    try {
      historyResp = await fetch('https://slack.com/api/conversations.history', {
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
    } catch (fetchErr) {
      console.error('❌ [GPT] Fetch to Slack failed');
      console.error('Name:', fetchErr.name);
      console.error('Message:', fetchErr.message);
      console.error('Stack:', fetchErr.stack);
      return;
    }

    console.log('✅ [GPT] Slack responded, reading body...');

    let raw;
    try {
      raw = await historyResp.text();
    } catch (readErr) {
      console.error('❌ [GPT] Error reading Slack response text:', readErr);
      return;
    }

    console.log('📨 [GPT] Raw Slack response:', raw);

    let history;
    try {
      history = JSON.parse(raw);
    } catch (parseErr) {
      console.error('❌ [GPT] Failed to parse Slack response JSON');
      console.error('Message:', parseErr.message);
      return;
    }

    if (!history.ok) {
      console.error('⚠️ [GPT] Slack returned error:', history.error);
      return;
    }

    const messages = history.messages.reverse().map(m => m.text).join('\n');
    console.log('✏️ [GPT] Messages fetched. Calling OpenAI...');

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

    console.log('📤 [GPT] GPT responded. Opening DM...');

    const dmResp = await fetch('https://slack.com/api/conversations.open', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ users: userId }),
    });

    const dm = await dmResp.json();
    if (!dm.ok) {
      console.error('❌ [GPT] Failed to open DM:', dm.error);
      return;
    }

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

    console.log(`✅ [GPT] Summary sent to user=${userId}`);
  } catch (err) {
    console.error('🔥 [GPT] Uncaught fatal error:');
    console.error('Name:', err.name);
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
  }
};
