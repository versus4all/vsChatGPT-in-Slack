const { pendingSummaries } = require('../lib/state');
const { runSummary } = require('../lib/summary');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  if (req.body?.type === 'url_verification') {
    return res.status(200).json({ challenge: req.body.challenge });
  }

  const event = req.body?.event;
  if (!event || event.type !== 'app_mention') {
    return res.status(200).end();
  }

  const { user, channel, thread_ts, text } = event;

  // Открыть личку для ответов
  const dmResponse = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({ users: user }),
  });

  const dmData = await dmResponse.json();
  const dmChannel = dmData.channel?.id;

  // Поддержка синтаксиса: "@ChatGPT summarize last 30 messages"
  const match = text.match(/last (\d+)/i);
  const limit = match ? parseInt(match[1], 10) : 20;

  // Отправка сообщения с кнопкой отмены
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel: dmChannel,
      text: '⏳ Подготовка summary...',
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

  // Запуск таймера на генерацию summary
  await runSummary({
    channel,
    thread_ts,
    user,
    dmChannel,
    limit,
    isThread: !!thread_ts,
  });

  return res.status(200).end();
};
