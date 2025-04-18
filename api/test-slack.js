// api/test-slack.js

const axios = require('axios');

module.exports = async (req, res) => {
  const channelId = process.env.TEST_CHANNEL_ID;
  const token = process.env.SLACK_BOT_TOKEN;

  console.log('✅ [TEST] Starting Slack diagnostics...');
  console.log('🧾 [TEST] Using channelId:', channelId);

  if (!channelId || !token) {
    return res.status(400).json({
      error: 'Missing required env vars (TEST_CHANNEL_ID or SLACK_BOT_TOKEN)',
    });
  }

  const body = { channel: channelId };
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json; charset=utf-8',
  };

  console.log('📤 [TEST] Request body:', JSON.stringify(body));
  console.log('📤 [TEST] Headers:', headers);

  try {
    const response = await axios.post(
      'https://slack.com/api/conversations.info',
      body,
      { headers }
    );

    console.log('📥 [TEST] Slack response:', JSON.stringify(response.data, null, 2));

    res.status(200).json({
      status: 'ok',
      sent: { body, headers },
      response: response.data,
    });
  } catch (err) {
    console.error('❌ [TEST] Axios error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
