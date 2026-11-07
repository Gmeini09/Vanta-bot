// Product plan embeds posted in the product channels. Edit freely — the bot
// updates the posted message on the next start.
module.exports = {
  private: {
    title: '🛒 Private Plan',
    features: ['Usermode'],
    pricing: [
      { label: '1 Month', prices: ['90 USD', '80 EURO'] },
      { label: '3 Months', prices: ['150 USD', '130 EURO'] },
      { label: '6 Months', prices: ['200 USD', '180 EURO'] },
    ],
  },
};
