// Builds a self-contained HTML transcript of a ticket channel.
const { AttachmentBuilder } = require('discord.js');

const MAX_MESSAGES = 2000;

async function fetchAll(channel) {
  const all = [];
  let before;
  while (all.length < MAX_MESSAGES) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    all.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }
  return all.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function text(s) {
  return esc(s).replace(/\n/g, '<br>');
}

function formatTime(ts) {
  return new Date(ts).toLocaleString('de-AT', { timeZone: 'Europe/Vienna' });
}

function renderEmbed(e) {
  const color = e.hexColor || '#8B5CF6';
  let html = `<div class="embed" style="border-color:${esc(color)}">`;
  if (e.author?.name) html += `<div class="e-author">${esc(e.author.name)}</div>`;
  if (e.title) html += `<div class="e-title">${esc(e.title)}</div>`;
  if (e.description) html += `<div class="e-desc">${text(e.description)}</div>`;
  for (const f of e.fields || []) {
    html += `<div class="e-field"><b>${esc(f.name)}</b><br>${text(f.value)}</div>`;
  }
  if (e.footer?.text) html += `<div class="e-footer">${esc(e.footer.text)}</div>`;
  return html + '</div>';
}

function renderMessage(m) {
  const avatar = m.author.displayAvatarURL({ size: 64, extension: 'png' });
  let body = '';
  if (m.content) body += `<div class="content">${text(m.content)}</div>`;
  for (const e of m.embeds) body += renderEmbed(e);
  for (const a of m.attachments.values()) {
    if (a.contentType?.startsWith('image/')) {
      body += `<a href="${esc(a.url)}"><img class="att-img" src="${esc(a.url)}" alt="${esc(a.name)}"></a>`;
    } else {
      body += `<div class="att">📎 <a href="${esc(a.url)}">${esc(a.name)}</a></div>`;
    }
  }
  if (!body) body = '<div class="content muted">(no text content)</div>';

  return `<div class="msg">
  <img class="avatar" src="${esc(avatar)}" alt="">
  <div class="main">
    <div class="meta"><span class="name">${esc(m.member?.displayName || m.author.username)}</span>${m.author.bot ? '<span class="bot">BOT</span>' : ''}<span class="time">${esc(formatTime(m.createdTimestamp))}</span></div>
    ${body}
  </div>
</div>`;
}

async function buildTranscript(channel, ticket = {}) {
  const messages = await fetchAll(channel);
  const title = `${channel.guild.name} — #${channel.name}`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
  body{margin:0;background:#313338;color:#dbdee1;font:15px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  header{padding:20px 24px;background:#2b2d31;border-bottom:1px solid #1e1f22}
  header h1{margin:0 0 6px;font-size:20px;color:#fff}
  header p{margin:0;color:#949ba4;font-size:13px}
  .wrap{padding:12px 16px 40px;max-width:1000px}
  .msg{display:flex;gap:14px;padding:8px;border-radius:6px}
  .msg:hover{background:#2e3035}
  .avatar{width:40px;height:40px;border-radius:50%;flex:none}
  .main{min-width:0;flex:1}
  .meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .name{color:#fff;font-weight:600}
  .bot{background:#5865f2;color:#fff;font-size:10px;padding:1px 5px;border-radius:3px;font-weight:700}
  .time{color:#949ba4;font-size:12px}
  .content{margin-top:2px;word-wrap:break-word}
  .muted{color:#6d6f78;font-style:italic}
  .embed{margin-top:6px;background:#2b2d31;border-left:4px solid;border-radius:4px;padding:10px 14px;max-width:520px}
  .e-author{font-size:13px;font-weight:600;color:#fff}
  .e-title{font-weight:700;color:#fff;margin:2px 0}
  .e-desc,.e-field{font-size:14px;margin-top:4px}
  .e-footer{font-size:12px;color:#949ba4;margin-top:6px}
  .att a,.e-desc a{color:#00a8fc}
  .att-img{max-width:360px;max-height:280px;border-radius:6px;margin-top:6px;display:block}
</style></head>
<body>
<header>
  <h1>${esc(title)}</h1>
  <p>Ticket #${esc(ticket.number != null ? String(ticket.number).padStart(4, '0') : '?')} ·${messages.length} messages · exported ${esc(formatTime(Date.now()))}</p>
</header>
<div class="wrap">
${messages.map(renderMessage).join('\n')}
</div>
</body></html>`;

  return { buffer: Buffer.from(html, 'utf8'), name: `transcript-${channel.name}.html`, count: messages.length };
}

function toAttachment(transcript) {
  return new AttachmentBuilder(transcript.buffer, { name: transcript.name });
}

module.exports = { buildTranscript, toAttachment };
