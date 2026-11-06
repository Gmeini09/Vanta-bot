# Vanta

A clean, self-hostable community Discord bot built with [discord.js v14](https://discord.js.org/).

## Features

- **Welcome messages** — greets new members with an embed.
- **Self-roles** — button panel for members to pick their own roles.
- **Tickets** — button opens a private support channel, button closes it.
- **Moderation** — `/kick`, `/ban`, `/warn`, `/clear`.
- **Utility** — `/help`, `/ping`.

All commands are slash commands with built-in permission gating.

## Requirements

- Node.js 18+
- A Discord application + bot ([Developer Portal](https://discord.com/developers/applications))

### Bot setup in the Developer Portal

1. Create an application → **Bot** → copy the **token**.
2. Under **Bot → Privileged Gateway Intents**, enable **Server Members Intent**
   (needed for welcome messages).
3. Invite the bot with the `bot` and `applications.commands` scopes and these
   permissions: Manage Roles, Manage Channels, Kick Members, Ban Members,
   Manage Messages, Moderate Members, Send Messages, Read Message History.

## Local development

```bash
npm install
cp .env.example .env     # fill in DISCORD_TOKEN and CLIENT_ID
npm run deploy           # register slash commands
npm start                # run the bot
```

Set `GUILD_ID` in `.env` during setup so commands appear instantly in your
server. Remove it (or leave empty) for global commands once you're done.

## Configuration

Everything is driven by environment variables — see [`.env.example`](.env.example).
IDs you'll want to set: `WELCOME_CHANNEL_ID`, `TICKET_CATEGORY_ID`,
`TICKET_SUPPORT_ROLE_ID`, and `ROLE_BUTTONS` (a JSON map of `customId` → `roleId`).

To get IDs: enable **Developer Mode** in Discord (Settings → Advanced), then
right-click a channel/role → **Copy ID**.

## Deploy on Railway

1. Push this repo to GitHub.
2. On [Railway](https://railway.app): **New Project → Deploy from GitHub repo**.
3. Add the variables from `.env.example` under the service's **Variables** tab.
   At minimum `DISCORD_TOKEN` and `CLIENT_ID`.
4. Railway builds with Nixpacks and runs `npm start` automatically.

Register commands once after the first deploy by running `npm run deploy`
locally (or temporarily set the start command to `npm run deploy`).

## Project structure

```
src/
  index.js            # entry point, loads commands + events
  deploy-commands.js  # registers slash commands with Discord
  config.js           # reads env vars
  commands/           # one file per slash command
  events/             # ready, guildMemberAdd, interactionCreate
  handlers/           # roles + tickets logic
```

## License

MIT
