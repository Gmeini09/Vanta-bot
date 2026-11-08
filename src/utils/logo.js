// Keeps the bot's profile picture and banner in sync with assets/logo.png and
// assets/banner.png. Only uploads when a file changed (Discord rate-limits these).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const store = require('./store');

const ASSETS = path.join(__dirname, '..', '..', 'assets');
const ITEMS = [
  { file: 'logo.png', key: 'logoHash', current: (u) => u.avatar, set: (u, d) => u.setAvatar(d), label: 'avatar' },
  { file: 'banner.png', key: 'bannerHash', current: (u) => u.banner, set: (u, d) => u.setBanner(d), label: 'banner' },
];

async function syncAvatar(client) {
  await client.user.fetch().catch(() => {}); // loads the current banner
  for (const item of ITEMS) {
    let data;
    try {
      data = fs.readFileSync(path.join(ASSETS, item.file));
    } catch {
      continue;
    }
    const hash = crypto.createHash('sha1').update(data).digest('hex');
    const meta = store.read('meta');
    if (meta[item.key] === hash && item.current(client.user)) continue;
    try {
      await item.set(client.user, data);
      store.write('meta', { ...store.read('meta'), [item.key]: hash });
      console.log(`[logo] Bot ${item.label} updated.`);
    } catch (err) {
      console.error(`[logo] Could not update ${item.label}:`, err.message);
    }
  }
}

module.exports = { syncAvatar };
