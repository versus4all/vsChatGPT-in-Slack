const { pendingSummaries } = require('../lib/state');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const userId = payload.user.id;
  const actionId = payload.actions?.[0]?.action_id;

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
          channel: payload.channel.id,
          text: '✅ Summary canceled.',
        }),
      });

      return res.status(200).end();
    } else {
      return res.status(200).send('⚠️ Nothing to cancel.');
    }
  }

  return res.status(200).send('✅ Button received.');
};
