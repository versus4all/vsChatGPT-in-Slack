// api/slack-interact.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { cancelSummary } = require('../lib/summary');
const state = require('../lib/state');
const qs = require('querystring');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // 1) Распарсим тело: form-urlencoded или JSON
    let payload;
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Slack шлёт { payload: '…JSON…' }
      const parsed = qs.parse(req.body);
      payload = JSON.parse(parsed.payload);
    } else {
      // Другие варианты (если вдруг)
      payload = req.body;
    }

    console.log('[INTERACT] Payload received:', JSON.stringify(payload));

    // 2) Обрабатываем только block_actions → cancel_summary
    if (
      payload.type === 'block_actions' &&
      payload.actions?.[0]?.action_id === 'cancel_summary'
    ) {
      const userId = payload.user.id;
      const threadTs = payload.message.ts;

      console.log(`[INTERACT] Cancel requested by user=${userId}, threadTs=${threadTs}`);

      const existing = await state.get(userId, threadTs);
      console.log(`[INTERACT] Current status in Redis: ${existing}`);

      if (existing === 'scheduled') {
        await cancelSummary(userId, threadTs);

        // Обновляем сообщение
        await fetch(payload.response_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: '❌ Summary has been cancelled.',
            replace_original: true,
          }),
        });

        console.log(`[INTERACT] Summary cancelled.`);
      } else {
        // Если задача уже выполнена или отменена
        await fetch(payload.response_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: '⚠️ Summary is no longer pending.',
            replace_original: true,
          }),
        });

        console.log(`[INTERACT] Cancel ignored — no active job.`);
      }

      return res.status(200).end();
    }

    // Всё остальное — просто 200
    return res.status(200).end();

  } catch (error) {
    console.error('[INTERACT] Error handling action:', error);
    return res.status(500).send('Internal Server Error');
  }
};
