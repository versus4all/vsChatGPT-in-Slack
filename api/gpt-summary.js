const { runSummary } = require('../lib/summary');
const { pendingSummaries } = require('../lib/state');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { user_id, channel_id, thread_ts, text } = req.body;
  const match = text?.match(/--last (\d+)/);
  const limit = match ? parseInt(match[1], 10) : 20;
  const isThread = !!thread_ts;

  console.log('[GPT-SUMMARY] Start requested by:', user_id);

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

  // Сообщение с кнопкой отмены
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

  console.log('[GPT-SUMMARY] Calling runSummary with user_id:', user_id);

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
