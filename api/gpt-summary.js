import { runSummary } from '../lib/summary.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { text, user_id, channel_id } = req.body;
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

  // Открываем DM канал
  const dmRes = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({ users: user_id }),
  });

  const dm = await dmRes.json();
  const dmChannel = dm.channel?.id;

  // Парсим лимит сообщений
  const match = text.match(/--last (\d+)/);
  const limit = match ? parseInt(match[1], 10) : 20;

  // Сообщение с кнопкой отмены
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
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

  // Запускаем summary через 30 секунд
  await runSummary({
    channel: channel_id,
    thread_ts: null,
    user: user_id,
    dmChannel,
    limit,
    isThread: false,
  });

  return res.status(200).end();
}
