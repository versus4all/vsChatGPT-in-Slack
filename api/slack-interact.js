const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { cancelSummary } = require('../lib/summary');
const state = require('../lib/state');
const qs = require('querystring');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // 1) Разбираем тело — поддерживаем form-urlencoded и JSON
    let payload;
    if (req.body && typeof req.body === 'object' && 'payload' in req.body) {
      const p = req.body.payload;
      payload = typeof p === 'string' ? JSON.parse(p) : p;
    } else if (typeof req.body === 'string') {
      const parsed = qs.parse(req.body);
      payload = parsed.payload ? JSON.parse(parsed.payload) : parsed;
    } else {
      payload = req.body;
    }

    console.log('[INTERACT] Payload received:', JSON.stringify(payload));

    // 2) Обрабатываем нажатие кнопки "Cancel summary"
    if (
      payload.type === 'block_actions' &&
      payload.actions?.[0]?.action_id === 'cancel_summary'
    ) {
      const userId = payload.user.id;
      const threadTs = payload.actions[0].value;    // ← теперь используем value кнопки

      console.log(`[INTERACT] Cancel requested by user=${userId}, threadTs=${threadTs}`);

      const existing = await state.get(userId, threadTs);
      console.log(`[INTERACT] Current status in Redis: ${existing}`);

      if (existing === 'scheduled') {
        await cancelSummary(userId, threadTs);

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

    // Всё прочее — возвращаем 200 OK
    return res.status(200).end();
  } catch (error) {
    console.error('[INTERACT] Error handling action:', error);
    return res.status(500).send('Internal Server Error');
  }
};
//"fix: use button.value for threadTs in slack-interact.js"
