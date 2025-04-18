const { runSummary } = require('../lib/summary');
const { pendingSummaries } = require('../lib/state');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { user_id, channel_id, thread_ts, text } = req.body;

  // Извлечение количества сообщений
  const match = text?.match(/--last (\d+)/);
  const limit = match ? parseInt(match[1], 10) : 20;
  const isThread = !!thread_ts;

  // Ответ в DM
  const dmRes = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({ users: user_id }),
  });

  const dmData = await dmRes.json();
  const dmChannel = dmData.channel?.id;

  // Сообщение "готовится"
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel: dmChannel,
      text: '⏳ Preparing summary...',
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: '⏳ *Summary is being prepared...*' },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '❌ Отменить', emoji: true },
              style: 'danger',
              action_id: 'cancel_summary',
            },
          ],
        },
      ],
    }),
  });

  await runSummary({
    channel: channel_id,
    thread_ts,
    user: user_id,
    dmChannel,
    limit,
    isThread,
  });

  return res.status(200).end();
};
