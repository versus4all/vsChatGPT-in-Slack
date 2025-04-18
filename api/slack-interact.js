const { pendingSummaries } = require('../lib/state');
const fetch = require('node-fetch'); // если нужен в твоей среде

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  // Slack может прислать JSON строкой или уже объектом
  const rawPayload = req.body?.payload || req.body;
  const parsed = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;

  const userId = parsed?.user?.id;
  const actionId = parsed?.actions?.[0]?.action_id;
  const channelId = parsed?.channel?.id || parsed?.container?.channel_id || parsed?.user?.id;

  if (!userId || !actionId) {
    console.error('❌ Bad Slack payload:', parsed);
    return res.status(400).send('Invalid payload');
  }

  console.log(`[cancel] Action: ${actionId}, User: ${userId}, Channel: ${channelId}`);

  if (actionId === 'cancel_summary') {
    if (pendingSummaries.has(userId)) {
      clearTimeout(pendingSummaries.get(userId));
      pendingSummaries.delete(userId);

      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        },
        body: JSON.stringify({
          channel: channelId,
          text: '✅ Summary canceled.',
        }),
      });

      return res.status(200).end();
    } else {
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        },
        body: JSON.stringify({
          channel: channelId,
          text: '⚠️ Nothing to cancel.',
        }),
      });

      return res.status(200).end();
    }
  }

  return res.status(200).send('✅ Button received.');
};
