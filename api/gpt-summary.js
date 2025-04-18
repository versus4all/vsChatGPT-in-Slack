const { pendingSummaries } = require('./state');

const runSummary = async ({ channel, thread_ts, user, dmChannel, limit, isThread }) => {
  console.log('[summary] Preparing timer for user:', user);

  const timeoutId = setTimeout(async () => {
    try {
      console.log('[summary] Generating summary for user:', user);

      const response = await fetch('https://slack.com/api/conversations.replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        },
        body: new URLSearchParams({
          channel,
          ts: thread_ts || '',
          limit: String(limit || 20),
        }),
      });

      const data = await response.json();
      const messages = data.messages || [];

      if (messages.length === 0) {
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          },
          body: JSON.stringify({
            channel: dmChannel,
            text: '⚠️ Не удалось найти сообщения для обзора.',
          }),
        });
        return;
      }

      const content = messages
        .map((m) => `• ${m.user || 'user'}: ${m.text}`)
        .slice(-limit)
        .join('\n');

      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'Сделай краткий обзор следующих Slack-сообщений:',
            },
            {
              role: 'user',
              content,
            },
          ],
        }),
      });

      const openaiJson = await openaiRes.json();
      const summary = openaiJson.choices?.[0]?.message?.content?.trim();

      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        },
        body: JSON.stringify({
          channel: dmChannel,
          text: summary || '⚠️ Не удалось сгенерировать обзор.',
        }),
      });
    } catch (error) {
      console.error('[summary] Error:', error);
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        },
        body: JSON.stringify({
          channel: dmChannel,
          text: '⚠️ Failed to generate summary.',
        }),
      });
    } finally {
      pendingSummaries.delete(user);
    }
  }, 30000); // 30 сек

  pendingSummaries.set(user, timeoutId);
};

module.exports = { runSummary };
