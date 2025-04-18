const state = require('./state');

async function createSummaryJob({ userId, threadTs, delayMs, callback }) {
  console.log(`[SUMMARY] Creating summary job for user=${userId} threadTs=${threadTs} delayMs=${delayMs}`);

  await state.set(userId, threadTs, 'scheduled', delayMs / 1000);

  setTimeout(async () => {
    const status = await state.get(userId, threadTs);
    console.log(`[SUMMARY] Status after delay: ${status}`);

    if (status === 'cancelled') {
      console.log(`[SUMMARY] Summary job for user=${userId} CANCELLED`);
      return;
    }

    await callback();
    await state.delete(userId, threadTs);
    console.log(`[SUMMARY] Summary sent and key deleted`);
  }, delayMs);
}

async function cancelSummary(userId, threadTs) {
  console.log(`[SUMMARY] Cancelling summary for user=${userId} threadTs=${threadTs}`);
  await state.set(userId, threadTs, 'cancelled', 60);
}

module.exports = {
  createSummaryJob,
  cancelSummary,
};
