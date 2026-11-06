# Vanta

A clean, self-hostable community Discord bot built with [discord.js v14](https://discord.js.org/).

## Features

- **Welcome & leave messages** — greets new members, announces leavers.
- **Auto-role** — automatically assign a role to new members.
- **Self-roles** — button panel for members to pick their own roles.
- **Ticket system**
  - Panel with a category dropdown (Support, Question, Report, Partnership, Other)
  - Each category has its own short form (Discord modal)
  - Numbered private channels (`support-0001`), one open ticket per member
  - Staff can **claim** tickets; close with confirmation and optional reason
  - Closed tickets can be **reopened**, exported or **deleted**
  - **HTML transcripts** sent to the ticket-log channel and DM'd to the owner
  - `/ticket add | remove | rename | close`
  - Categories and questions are editable in `src/tickets/categories.js`
- **Settings in Discord** — `/settings` to set channels and roles without touching env vars.
- **Moderation** — kick, ban, unban, timeout, warnings (persistent), clear,
  slowmode, lock/unlock, with optional mod-log channel.
- **Giveaways** — start reaction giveaways with multiple winners + reroll.
- **Utility** — userinfo, serverinfo, avatar, poll, say, embed.
- **Server setup** — `/setup-server` wipes and rebuilds the server, creates a
  staff area with mod/ticket logs, posts the ticket panel and saves all settings.
- **Giveaways survive restarts** — running giveaways are stored and resumed.

All commands are slash commands with built-in permission gating, and they are
**auto-registered on startup** — no separate deploy step needed.

## Commands

| Command | Permission | What it does |
|---|---|---|
| `/help` | — | List all commands |
| `/ping` | — | Bot latency |
| `/userinfo` | — | Info about a user |
| `/serverinfo` | — | Info about the server |
| `/avatar` | — | Show a user's avatar |
| `/poll` | — | Reaction poll (up to 5 options) |
| `/ticket-panel` | Manage Channels | Post the ticket panel |
| `/ticket` | owner / staff | Close, add/remove members, rename the current ticket |
| `/settings` | Manage Server | View / change channels and roles used by the bot |
| `/role-panel` | Manage Roles | Post self-role buttons |
| `/kick` | Kick Members | Kick a member |
| `/ban` | Ban Members | Ban a member |
| `/unban` | Ban Members | Unban by user ID |
| `/timeout` | Moderate Members | Temporarily mute (e.g. `10m`, `2h`, `1d`) |
| `/untimeout` | Moderate Members | Remove a timeout |
| `/warn` | Moderate Members | Warn a member (stored) |
| `/warnings` | Moderate Members | List / clear a member's warnings |
| `/clear` | Manage Messages | Bulk delete messages |
| `/slowmode` | Manage Channels | Set channel slowmode |
| `/lock` `/unlock` | Manage Channels | Lock / unlock a channel |
| `/say` `/embed` | Manage Messages | Send a message / embed as the bot |
| `/giveaway` | Manage Server | Start / reroll giveaways |
| `/setup-server` | Administrator | Wipe & rebuild channels and roles |

## Requirements

- Node.js 18+
- A Discord application + bot ([Developer Portal](https://discord.com/developers/applications))

### Bot setup in the Developer Portal

1. Create an application → **Bot** → copy the **token**.
2. Under **Bot → Privileged Gateway Intents**, enable **Server Members Intent**
   and **Message Content Intent** (needed for ticket transcripts; the bot still
   starts without it, but transcripts won't contain message text).
3. Invite with the `bot` and `applications.commands` scopes and these
   permissions: Manage Roles, Manage Channels, Kick Members, Ban Members,
   Manage Messages, Moderate Members, Send Messages, Read Message History,
   Add Reactions.

## Local development

```bash
npm install
cp .env.example .env     # fill in DISCORD_TOKEN and CLIENT_ID
npm start                # commands register automatically on startup
```

Set `GUILD_ID` in `.env` so commands appear instantly in your server.

## Configuration

Everything is driven by environment variables — see [`.env.example`](.env.example):

| Variable | Purpose |
|---|---|
| `DISCORD_TOKEN` | **required** — bot token |
| `CLIENT_ID` | **required** — application ID |
| `GUILD_ID` | register commands to one guild instantly |
| `WELCOME_CHANNEL_ID` | welcome messages |
| `LEAVE_CHANNEL_ID` | leave messages (falls back to welcome) |
| `AUTOROLE_ID` | role given to new members |
| `MODLOG_CHANNEL_ID` | channel for moderation logs |
| `TICKET_CATEGORY_ID` | category for ticket channels |
| `TICKET_SUPPORT_ROLE_ID` | staff role for tickets |
| `ROLE_BUTTONS` | JSON map of `customId` → `roleId` |
| `DATA_DIR` | where warnings are stored (use a Railway Volume) |

Enable **Developer Mode** in Discord (Settings → Advanced), then right-click a
channel/role/user → **Copy ID**.

## Deploy on Railway

1. Push to GitHub.
2. Railway → **New Project → Deploy from GitHub repo**.
3. Add the variables above under the service's **Variables** tab (at minimum
   `DISCORD_TOKEN` and `CLIENT_ID`).
4. Railway builds with Nixpacks and runs `npm start`. Commands auto-register.

### Persistent data

Settings, warnings, ticket data and giveaways are stored as JSON in `DATA_DIR`.
Railway's filesystem is wiped on each deploy, so add a **Volume** mounted at
`/data` and set `DATA_DIR=/data`.

## Project structure

```
src/
  index.js            # entry point, loads commands + events
  deploy-commands.js  # manual command registration (optional)
  config.js           # reads env vars
  commands/           # one file per slash command
  events/             # ready, join, leave, interactions
  handlers/           # self-role buttons
  tickets/            # ticket manager, categories, transcripts
  utils/              # store, settings, warnings, giveaways, mod-log
```

## License

MIT
