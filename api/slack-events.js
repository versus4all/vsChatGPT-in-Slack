// api/slack-events.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const qs = require('querystring');
const { createSummaryJob } = require('../lib/summary');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const contentType = req.headers['content-type'] || '';
  let payload = req.body;

  // Если пришло form-urlencoded (Events API)
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const parsed = qs.parse(req.body);
    payload = parsed.payload ? JSON.parse(parsed.payload) : parsed;
  }

  // URL verification (Slack проверка endpoint)
  if (payload.type === 'url_verification') {
    return res.status(200).send(payload.challenge);
  }

  // Событие Events API
  const event = payload.event || payload;

  // 1) Реакция 📄 (page_facing_up)
  if (event.type === 'reaction_added' && event.reaction === 'page_facing_up') {
    const userId   = event.user;
    const threadTs = event.item.thread_ts || event.item.ts;
    console.log(`[EVENTS] reaction_added by ${userId}, threadTs=${threadTs}`);
    await createSummaryJob({
      userId,
      threadTs,
      delayMs: 30000,
      callback: async () => {
        // тут можно скопировать логику из api/gpt-summary.js callback
        await fetch('https://slack.com/api/chat.postMessage', { /* … */ });
      },
    });
  }

  // 2) Упоминание @ChatGPT
  if (event.type === 'app_mention' && /резюме|обзор|summary/i.test(event.text)) {
    const userId   = event.user;
    const threadTs = event.thread_ts || event.ts;
    console.log(`[EVENTS] app_mention by ${userId}, threadTs=${threadTs}`);
    await createSummaryJob({
      userId,
      threadTs,
      delayMs: 30000,
      callback: async () => {
        // можно вызвать тот же callback из api/gpt-summary.js
      },
    });
  }

  return res.status(200).end();
};
