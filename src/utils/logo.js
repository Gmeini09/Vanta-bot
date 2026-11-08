// Keeps the bot's profile picture in sync with assets/logo.png. Only uploads
// when the file changed (Discord rate-limits avatar changes).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const store = require('./store');

const FILE = path.join(__dirname, '..', '..', 'assets', 'logo.png');

async function syncAvatar(client) {
  let data;
  try {
    data = fs.readFileSync(FILE);
  } catch {
    return;
  }
  const hash = crypto.createHash('sha1').update(data).digest('hex');
  const meta = store.read('meta');
  if (meta.logoHash === hash && client.user.avatar) return;

  try {
    await client.user.setAvatar(data);
    store.write('meta', { ...meta, logoHash: hash });
    console.log('[logo] Bot avatar updated.');
  } catch (err) {
    console.error('[logo] Could not update avatar:', err.message);
  }
}

module.exports = { syncAvatar };
