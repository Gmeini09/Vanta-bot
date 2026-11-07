// Product plan embeds posted in the product channels. Edit freely — the bot
// updates the posted message on the next start.
module.exports = {
  private: {
    title: '🛒 Private Plan',
    features: ['Usermode'],
    pricing: [
      { label: '1 Month', prices: ['70 USD', '60 EURO'] },
      { label: '3 Months', prices: ['130 USD', '110 EURO'] },
      { label: '6 Months', prices: ['180 USD', '160 EURO'] },
    ],
  },
};
