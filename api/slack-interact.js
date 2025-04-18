const { cancelSummary } = require('../lib/summary');
const state = require('../lib/state');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const payload = JSON.parse(req.body);

    // Проверяем тип действия (только для кнопки)
    if (payload.type === 'block_actions' && payload.actions?.[0]?.action_id === 'cancel_summary') {
      const userId = payload.user.id;
      const threadTs = payload.message.ts;

      console.log(`[INTERACT] Cancel requested by user=${userId}, threadTs=${threadTs}`);

      const existing = await state.get(userId, threadTs);
      if (existing === 'scheduled') {
        await cancelSummary(userId, threadTs);

        // Обновляем сообщение в Slack
        await fetch(payload.response_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: '❌ Summary has been cancelled.',
            replace_original: true,
          }),
        });

        console.log(`[INTERACT] Summary cancelled.`);
      } else {
        // Если задача уже выполнена/отменена
        await fetch(payload.response_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: '⚠️ Summary is no longer pending.',
            replace_original: true,
          }),
        });

        console.log(`[INTERACT] Cancel ignored — no active job.`);
      }

      return res.status(200).end();
    }

    // Если пришло что-то другое — просто завершаем
    return res.status(200).end();
  } catch (error) {
    console.error('[INTERACT] Error handling action:', error);
    return res.status(500).send('Internal Server Error');
  }
};
