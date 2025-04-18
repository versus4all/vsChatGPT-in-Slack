const { createSummaryJob } = require('../lib/summary');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const body = req.body;

    const userId = body.user_id;
    const threadTs = body.thread_ts || body.ts || 'default';
    const delayMs = 30000; // 30 seconds

    console.log(`[GPT-SUMMARY] Received request from user=${userId}, threadTs=${threadTs}`);

    // Отправляем "ожидание" и кнопку отмены
    const payload = {
      response_type: 'ephemeral',
      text: '⏳ Summary will be generated in 30 seconds…',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '⏳ Summary will be generated in 30 seconds…',
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '❌ Cancel summary',
              },
              action_id: 'cancel_summary',
              style: 'danger',
            },
          ],
        },
      ],
    };

    res.status(200).json(payload);

    // Запускаем отложенную задачу
    await createSummaryJob({
      userId,
      threadTs,
      delayMs,
      callback: async () => {
        console.log(`[GPT-SUMMARY] Generating summary for user=${userId}, threadTs=${threadTs}`);

        // TODO: здесь должен быть твой код генерации summary
        // Пример:
        const summaryText = `🧠 Summary for thread \`${threadTs}\` (user: ${userId})`;

        // Отправляем пользователю в личку
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: userId,
            text: summaryText,
          }),
        });

        console.log(`[GPT-SUMMARY] Summary sent to user=${userId}`);
      },
    });
  } catch (error) {
    console.error('[GPT-SUMMARY] Error:', error);
    res.status(500).send('Internal Server Error');
  }
};
