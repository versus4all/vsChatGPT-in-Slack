import { pendingSummaries } from './slack-interact';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { type, challenge, event } = req.body;
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const allowedUserId = 'U02982R3A0J';

  // Проверка URL Slack
  if (type === 'url_verification') {
    return res.status(200).json({ challenge });
  }

  // Обработка упоминаний бота и добавления реакции 📄
  if (
    (event?.type === 'app_mention' && event.user === allowedUserId) ||
    (event?.type === 'reaction_added' && event.reaction === 'page_facing_up' && event.user === allowedUserId)
  ) {
    try {
      const isThread =
        event.type === 'reaction_added' || /тред|thread/.test(event.text?.toLowerCase() || '');
      const lastMatch = event.text?.match(/(\d{1,3})/) || [];
      const limit = parseInt(lastMatch[1], 10) || 20;
      const channel = event.item?.channel || event.channel;
      const thread_ts = event.item?.ts || event.thread_ts;

      // Открытие личного канала с пользователем
      const dmRes = await fetch('https://slack.com/api/conversations.open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        },
        body: JSON.stringify({ users: event.user }),
      });

      const dm = await dmRes.json();
      const dmChannel = dm.channel?.id;

      // Отправка сообщения с кнопкой отмены
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

      // Запуск таймера на 30 секунд
      const timeoutId = setTimeout(async () => {
        pendingSummaries.delete(event.user);

        // Получение сообщений
        let messages = [];

        if (isThread && thread_ts) {
          const replies = await fetch(
            `https://slack.com/api/conversations.replies?channel=${channel}&ts=${thread_ts}&limit=100`,
            {
              headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
            }
          ).then((res) => res.json());
          messages = replies.messages?.map((m) => m.text).filter(Boolean);
        } else {
          const history = await fetch(
            `https://slack.com/api/conversations.history?channel=${channel}&limit=${limit}`,
            {
              headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
            }
          ).then((res) => res.json());
          messages = history.messages?.reverse().map((m) => m.text).filter(Boolean);
        }

        const inputText = messages.join('\n\n').trim();
        if (!inputText) return;

        const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: `You're a Slack assistant. Summarize messages like this:

*🧠 Topic:* ...  
*👥 Participants:* ...  
*📋 Key Points:*  
• ...  
*✅ Decisions:*  
• ...  
*🔐 Credentials:*  
• IPs / URLs / passwords, etc.`,
              },
              {
                role: 'user',
                content: inputText,
              },
            ],
          }),
        }).then((res) => res.json());

        const summary = gptRes.choices?.[0]?.message?.content || '⚠️ GPT returned no summary.';

        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
          },
          body: JSON.stringify({
            channel: dmChannel,
            text: summary,
          }),
        });
      }, 30000); // 30 секунд

      pendingSummaries.set(event.user, timeoutId);
      return res.status(200).end();
    } catch (err) {
      console.error('summary error:', err);
      return res.status(200).send('⚠️ Summary process failed.');
    }
  }

  res.status(200).end();
}
