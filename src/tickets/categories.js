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
    welcome: 'Tell us which product you want and how you would like to pay — the team will be with you shortly.',
    questions: [
      { id: 'subject', label: 'Which product?', placeholder: 'e.g. public, private, kernel', required: true },
      { id: 'payment', label: 'Payment method', placeholder: 'How do you want to pay?', required: false },
      { id: 'details', label: 'Anything else?', placeholder: 'Questions, duration, …', long: true, required: false },
    ],
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
