// api/test-slack.js

const axios = require('axios');

module.exports = async (req, res) => {
  console.log('✅ [TEST] Starting Slack API test with axios + env var...');
  const channelId = process.env.TEST_CHANNEL_ID;

  console.log('[TEST] Using channelId:', channelId);

  if (!channelId) {
    console.error('❌ [TEST] TEST_CHANNEL_ID is not set in env');
    return res.status(400).json({ error: 'Missing TEST_CHANNEL_ID in environment variables' });
  }

  try {
    const response = await axios.post(
      'https://slack.com/api/conversations.info',
      { channel: channelId },
      {
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );

    console.log('[TEST] Slack response data:', JSON.stringify(response.data, null, 2));

    if (!response.data.ok) {
      console.error('[TEST] Slack API returned error:', response.data.error);
    } else {
      console.log('[TEST] Slack API call succeeded.');
    }

    res.status(200).json({ status: 'ok', response: response.data });
  } catch (err) {
    console.error('[TEST] Axios request failed:', err.message);
    res.status(500).json({ error: err.message });
  }
};
