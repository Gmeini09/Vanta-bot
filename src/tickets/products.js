// What can be bought through a Purchase ticket. Shown as dropdowns before the
// ticket is opened. Edit freely (max 25 entries each). `description` is optional
// (e.g. a price) and shows under the option in the dropdown.
module.exports = {
  versions: [
    { key: 'public', label: 'Public', emoji: '🛒', description: 'Public version' },
    { key: 'private', label: 'Private', emoji: '🛒', description: 'Private version' },
  ],
  durations: [
    { key: '1m', label: '1 Month' },
    { key: '3m', label: '3 Months' },
    { key: '6m', label: '6 Months' },
    { key: 'lifetime', label: 'Lifetime' },
  ],
};
