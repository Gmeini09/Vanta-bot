// Ticket categories shown in the panel's dropdown. Each category gets its own
// form (max 5 questions) and channel name prefix. Edit freely.
//   question.long = true  -> multi-line text box
//   question.required = false -> optional field
module.exports = [
  {
    key: 'support',
    label: 'Support',
    emoji: '🛠️',
    description: 'Get help with a problem',
    prefix: 'support',
    welcome: 'Describe your problem as precisely as possible — screenshots help a lot.',
    questions: [
      { id: 'subject', label: 'What do you need help with?', placeholder: 'Short summary', required: true },
      { id: 'details', label: 'Details', placeholder: 'Explain the problem in detail', long: true, required: true },
    ],
  },
  {
    key: 'question',
    label: 'Question',
    emoji: '❓',
    description: 'Ask the team anything',
    prefix: 'question',
    welcome: 'Ask away — the team will answer as soon as possible.',
    questions: [
      { id: 'subject', label: 'Your question', placeholder: 'What would you like to know?', long: true, required: true },
    ],
  },
  {
    key: 'report',
    label: 'Report a member',
    emoji: '🚨',
    description: 'Report someone breaking the rules',
    prefix: 'report',
    welcome: 'Thanks for the report. Please add any evidence (screenshots, message links).',
    questions: [
      { id: 'subject', label: 'Who are you reporting?', placeholder: 'Username or ID', required: true },
      { id: 'details', label: 'What happened?', placeholder: 'Describe the situation', long: true, required: true },
      { id: 'evidence', label: 'Evidence (links)', placeholder: 'Message links, screenshot links…', long: true, required: false },
    ],
  },
  {
    key: 'partnership',
    label: 'Partnership',
    emoji: '🤝',
    description: 'Collaboration and partnership requests',
    prefix: 'partner',
    welcome: 'Tell us about your project — a team member will review your request.',
    questions: [
      { id: 'subject', label: 'Server / project name', placeholder: 'Name', required: true },
      { id: 'invite', label: 'Invite link', placeholder: 'discord.gg/…', required: false },
      { id: 'details', label: 'Your proposal', placeholder: 'What do you have in mind?', long: true, required: true },
    ],
  },
  {
    key: 'other',
    label: 'Other',
    emoji: '💬',
    description: 'Anything else',
    prefix: 'ticket',
    welcome: 'A team member will be with you shortly.',
    questions: [
      { id: 'subject', label: 'Subject', placeholder: 'What is this about?', required: true },
      { id: 'details', label: 'Details', placeholder: 'Tell us more', long: true, required: false },
    ],
  },
];
