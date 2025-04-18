const { pendingSummaries } = require('../lib/state');
const { runSummary } = require('../lib/summary');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { user_id, channel_id, thread_ts, text } = req.body;
  const match = text?.match(/--last (\d+)/);
  const limit = match ? parseInt(match[1], 10) : 20;
  const isThread = !!thread_ts;

  console.log('[GPT-SUMMARY] Requested by:', user_id);

  // Создаём пустой "маяк", чтобы можно было отменить до запуска таймера
  pendingSummaries.set(user_id, null);

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

  // Показываем кнопку отмены
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

  // Ставим таймер чуть позже, чтобы Slack успел отрисовать
  setTimeout(() => {
    runSummary({
      channel: channel_id,
      thread_ts,
      user: user_id,
      dmChannel,
      limit,
      isThread,
    });
  }, 100); // 100ms задержка

  return res.status(200).end();
};
