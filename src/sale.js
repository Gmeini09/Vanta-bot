// Limited-time discount posted in the discount channel. While it runs the bot
// keeps the post up; when `endsAt` (unix seconds) has passed it deletes it.
// To start a new sale, change percent/endsAt and redeploy.
module.exports = {
  percent: 9,
  endsAt: 1794486480, // 2026-11-12 13:28 (Vienna)
  plans: ['public', 'private'],
};
