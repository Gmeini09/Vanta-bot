// What can be bought through a Purchase ticket. Shown as dropdowns before the
// ticket is opened. Edit freely (max 25 entries each). `description` is optional
// (e.g. a price) and shows under the option in the dropdown.
module.exports = {
  versions: [
    { key: 'public', label: 'Public', emoji: '🛒', description: 'Public version' },
    { key: 'private', label: 'Private', emoji: '🛒', description: 'Private version' },
    { key: 'kernel', label: 'Kernel', emoji: '🛒', description: 'Kernel version' },
  ],
  durations: [
    { key: '1d', label: '1 Day' },
    { key: '1w', label: '1 Week' },
    { key: '1m', label: '1 Month' },
    { key: 'lifetime', label: 'Lifetime' },
  ],
};
