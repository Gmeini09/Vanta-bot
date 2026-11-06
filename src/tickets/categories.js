// Ticket categories shown in the panel's dropdown. Each category gets its own
// form (max 5 questions) and channel name prefix. Edit freely.
//   question.long = true  -> multi-line text box
//   question.required = false -> optional field
module.exports = [
  {
    key: 'purchase',
    label: 'Purchase',
    emoji: '🛒',
    description: 'Orders, payments and products',
    prefix: 'purchase',
    // Own category for purchase tickets (falls back to the normal ticket category).
    parentSetting: 'purchaseTicketCategoryId',
    // Instead of a form, the member picks version + duration from dropdowns (src/tickets/products.js).
    shop: true,
    welcome: 'Thanks for your order! A team member will be with you shortly to sort out the payment.',
    questions: [],
  },
  {
    key: 'support',
    label: 'Support',
    emoji: '🛠️',
    description: 'Help, questions and issues',
    prefix: 'support',
    welcome: 'Describe your problem as precisely as possible — screenshots help a lot.',
    questions: [
      { id: 'subject', label: 'What do you need help with?', placeholder: 'Short summary', required: true },
      { id: 'details', label: 'Details', placeholder: 'Explain the problem in detail', long: true, required: true },
    ],
  },
];
