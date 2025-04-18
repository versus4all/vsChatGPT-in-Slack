const { pendingSummaries } = require('./state');

const runSummary = async ({ channel, thread_ts, user, dmChannel, limit = 20, isThread }) => {
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  const timeoutId = setTimeout(async () => {
    console.log('[SUMMARY] Starting for user:', user);
    pendingSummaries.delete(user);

    try {
      const url = isThread && thread_ts
        ? `https://slack.com/api/conversations.replies?channel=${channel}&ts=${thread_ts}&limit=100`
        : `https://slack.com/api/conversations.history?channel=${channel}&limit=${limit}`;

      const history = await fetch(url, {
        headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
      }).then((res) => res.json());

      const messages = (history.messages || [])
        .reverse()
        .map((m) => m.text)
        .filter(Boolean);

      const inputText = messages.join('\n\n').trim();
      if (!inputText) throw new Error('No messages to summarize.');

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
              content: `You're a Slack assistant. Summarize messages like this:\n\n* Topic:* ... \n* Participants:* ... \n* Key Points:*\n• ...\n*✅ Decisions:*\n• ...\n* Credentials:* ...`,
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
    } catch (err) {
      console.error('[SUMMARY ERROR]', err);
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        },
        body: JSON.stringify({
          channel: dmChannel,
          text: '⚠️ Failed to generate summary.',
        }),
      });
    }
  }, 30000); // <- основная задержка перед генерацией

  console.log('[SET] Timeout registered for user:', user);
  pendingSummaries.set(user, timeoutId);
};

module.exports = { runSummary };
