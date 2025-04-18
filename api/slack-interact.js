const { pendingSummaries } = require('../lib/state');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const rawPayload = req.body?.payload || req.body;
  const payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;

  const userId = payload?.user?.id;
  const actionId = payload?.actions?.[0]?.action_id;
  const channelId = payload?.channel?.id || payload?.container?.channel_id || userId;

  console.log('[INTERACT] Action:', actionId, '| From user:', userId);

  if (actionId === 'cancel_summary') {
    if (pendingSummaries.has(userId)) {
      console.log('[INTERACT] Cancelling timeout for user:', userId);
      const timeoutId = pendingSummaries.get(userId);
      if (timeoutId) clearTimeout(timeoutId);
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
      console.log('[INTERACT] Nothing to cancel for user:', userId);
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

  return res.status(200).send('✅ Interaction received.');
};
