if (!global.pendingSummaries) {
  global.pendingSummaries = new Map();
}

module.exports = {
  pendingSummaries: global.pendingSummaries,
};
