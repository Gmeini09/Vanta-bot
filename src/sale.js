// Limited-time discount posted in the discount channel. While it runs the bot
// keeps the post up; when `endsAt` (unix seconds) has passed it deletes it.
// To start a new sale, change percent/endsAt and redeploy.
module.exports = {
  percent: 50,
  endsAt: 1794586620, // 2026-11-13 17:17 (Vienna)
  plans: ['public', 'private'],
};
