// Product plan embeds posted in the product channels. Edit freely — the bot
// updates the posted message on the next start.
module.exports = {
  public: {
    title: '🛒 Public Plan',
    features: [],
    pricing: [
      { label: '1 Month', prices: ['55 USD', '45 EURO'] },
      { label: 'Lifetime', prices: ['105 USD', '85 EURO'] },
    ],
  },
  private: {
    title: '🛒 Private Plan',
    features: [],
    pricing: [
      { label: '1 Month', prices: ['70 USD', '60 EURO'] },
      { label: '3 Months', prices: ['115 USD', '95 EURO'] },
      { label: '6 Months', prices: ['150 USD', '130 EURO'] },
    ],
  },
};
