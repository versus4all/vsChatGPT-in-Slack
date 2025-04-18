// api/test-slack.js

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

module.exports = async (req, res) => {
  console.log('✅ [TEST] Starting Slack API test...');
  const channelId = 'C02VDCVNJ01'; // 👈 Твой актуальный ID канала

  try {
    const slackResp = await fetch('https://slack.com/api/conversations.info', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json; charset=utf-8', // ✅ charset добавлен
      },
      body: JSON.stringify({ channel: channelId }),
    });

    console.log('[TEST] Slack status:', slackResp.status);

    const raw = await slackResp.text();
    console.log('[TEST] Raw Slack response:', raw);

    let json;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      console.error('[TEST] Failed to parse Slack JSON:', err.message);
      res.status(500).json({ error: 'Slack response not JSON' });
      return;
    }

    if (!json.ok) {
      console.error('[TEST] Slack error:', json.error);
    } else {
      console.log('[TEST] Slack API call success.');
    }

    res.status(200).json({ status: 'ok', response: json });
  } catch (err) {
    console.error('[TEST] Fatal error:', err.name, err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
};
