import { pendingSummaries } from './state.js';

export async function runSummary({ channel, thread_ts, user, dmChannel, limit = 20, isThread }) {
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  const timeoutId = setTimeout(async () => {
    pendingSummaries.delete(user);

    let messages = [];

    try {
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
              content: `You're a Slack assistant. Summarize messages like this:

*🧠 Topic:* ...  
*👥 Participants:* ...  
*📋 Key Points:*  
• ...  
*✅ Decisions:*  
• ...  
*🔐 Credentials:* ...`,
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
      console.error('runSummary error:', err);
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
  }, 30_000);

  pendingSummaries.set(user, timeoutId);
}
