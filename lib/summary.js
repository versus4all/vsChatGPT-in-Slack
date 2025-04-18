// lib/summary.js
const state = require('./state');

async function createSummaryJob({ userId, threadTs, delayMs, callback }) {
  await state.set(userId, threadTs, 'scheduled', delayMs / 1000);

  setTimeout(async () => {
    const status = await state.get(userId, threadTs);
    if (status === 'cancelled') {
      console.log('Summary job cancelled.');
      return;
    }

    await callback();
    await state.delete(userId, threadTs);
  }, delayMs);
}

async function cancelSummary(userId, threadTs) {
  await state.set(userId, threadTs, 'cancelled', 60);
}

module.exports = {
  createSummaryJob,
  cancelSummary,
};
