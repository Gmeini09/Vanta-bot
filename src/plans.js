// Product plan embeds posted in the product channels. Edit freely — the bot
// updates the posted message on the next start.
module.exports = {
  public: {
    title: '🛒 Public Plan',
    features: [],
    pricing: [
      { label: '1 Month', prices: ['55 USD', '45 EURO'] },
      { label: 'Lifetime', prices: ['120 USD', '100 EURO'] },
    ],
  },
  private: {
    title: '🛒 Private Plan',
    features: [],
    pricing: [
      { label: '1 Month', prices: ['70 USD', '60 EURO'] },
      { label: '3 Months', prices: ['130 USD', '110 EURO'] },
      { label: '6 Months', prices: ['180 USD', '160 EURO'] },
    ],
  },
};
