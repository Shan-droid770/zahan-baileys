<div align="center">
  <h1>💫 zahan-baileys</h1>
  <p><em>A modern WhatsApp Multi-Device library for Node.js — with an integrated MessageBuilder, interactive messages, and channel support built in.</em></p>

  <img src="docs/assets/zahan-banner.svg" width="640" alt="Zahan Baileys Banner" />
  <br>
  <sub>Owner-provided artwork: <a href="https://h.uguu.se/zNSVikNH.jpg">zNSVikNH.jpg</a></sub>
  <br><br>

  <p>
    <a href="https://www.npmjs.com/package/zahan-baileys">
      <img src="https://img.shields.io/npm/v/zahan-baileys?color=blueviolet&label=version&logo=npm" alt="npm version" />
    </a>
    <a href="https://www.npmjs.com/package/zahan-baileys">
      <img src="https://img.shields.io/npm/dt/zahan-baileys?color=blueviolet&label=downloads&logo=npm" alt="npm downloads" />
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-success" alt="license" />
    </a>
    <img src="https://img.shields.io/badge/version-1.0.0-7F5AF0" alt="release" />
    <img src="https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Module-ESM-F7DF1E?logo=javascript&logoColor=black" alt="ESM" />
    <img src="https://img.shields.io/badge/Made%20in-Sri%20Lanka-FFC72C" alt="Sri Lanka" />
  </p>

  <p>
    <strong>Package:</strong> <code>zahan-baileys</code> · <strong>Version:</strong> 1.0.0 · <strong>Owner / Developer:</strong> SAHAN OFC<br>
    <strong>Official website:</strong> <a href="https://www.sahanhost.qzz.io">www.sahanhost.qzz.io</a> · <strong>Country:</strong> Sri Lanka 🇱🇰
  </p>

  <p>
    <a href="https://www.sahanhost.qzz.io">
      <img src="https://img.shields.io/badge/Official-Website-7F5AF0?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Official website" />
    </a>
    <a href="https://github.com/Shan-droid770/zahan-baileys">
      <img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github" alt="GitHub" />
    </a>
    <a href="https://www.npmjs.com/package/zahan-baileys">
      <img src="https://img.shields.io/badge/npm-zahan--baileys-CB3837?style=for-the-badge&logo=npm" alt="npm" />
    </a>
  </p>
</div>

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212257468-1e9a91f1-b636-4676-a213-39d67b2d5d67.gif" width="100%">
</div>

## 🐞 Found a Bug?

For questions, collaboration, bug reports, or anything else, reach out through the channels below.

<p align="left">
  <a href="https://www.sahanhost.qzz.io">
    <img src="https://img.shields.io/badge/Website-Official%20Site-7F5AF0?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Official website" />
  </a>
  <a href="https://github.com/Shan-droid770/zahan-baileys/issues">
    <img src="https://img.shields.io/badge/GitHub-Open%20an%20Issue-181717?style=for-the-badge&logo=github" alt="GitHub issues" />
  </a>
  <a href="mailto:hello@sahanhost.qzz.io">
    <img src="https://img.shields.io/badge/Email-Contact%20Us-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Email" />
  </a>
</p>

---

> [!IMPORTANT]
> `zahan-baileys` is an unofficial WhatsApp Web API library. It is not affiliated with, authorized by, maintained by, sponsored by, or endorsed by WhatsApp or Meta.
>
> Use this project responsibly and comply with the WhatsApp Terms of Service and applicable laws.

> [!NOTE]
> Features reconstructed from the WhatsApp Web bundle, together with how far each one has been verified, are documented in [EXPERIMENTAL.md](EXPERIMENTAL.md).

> [!NOTE]
> This project is built on the Baileys ecosystem, with bug fixes, compatibility work, interactive message support, and a built-in MessageBuilder added on top.

---

## 📌 Overview

`zahan-baileys` is a modern, ESM-first WhatsApp Multi-Device library. It combines the socket layer, protocol utilities, LID-aware addressing, and a built-in MessageBuilder in one dependency. Buttons, native-flow messages, carousels, and AIRich layouts are available directly from the package — no separate builder dependency is needed.

### ✨ Highlights

| Feature | Description |
|---|---|
| 🔌 Multi-Device | Connects to WhatsApp using the Baileys Multi-Device protocol. |
| 🔐 Pairing code | Standard pairing codes plus custom 8-character codes. |
| 🖱️ Interactive buttons | Quick reply, URL, copy, call, list/select, location, and other native-flow buttons. |
| 🧱 Integrated MessageBuilder | `Button`, `ButtonV2`, `Carousel`, `AIRich`, and `Toolkit` all ship in the same package. |
| 🖼️ Albums | Send several images or videos as a single album message. |
| 📢 Channels | Create, follow, edit, react to, and read WhatsApp Channels. |
| 👥 Groups | Group creation, member management, metadata, descriptions, and more. |
| 🪪 LID / PN addressing | Supports the newer LID addressing while also exposing the PN/JID alternative WhatsApp provides. |
| 📷 Profile photos | Read, update, and remove profile pictures. |
| 🤖 AI Rich | Experimental rich-response builder for text, code, tables, media, suggestions, and other layouts. |
| 📞 Voice & video calls | Place audio, video, and screen-sharing calls on the bot's existing session, with playlists that drive the call. |
| 🗄️ Database sessions | Store sessions in SQLite, PostgreSQL, MySQL, MongoDB, Redis, or NekoDB instead of files. |
| 📦 ESM | ESM-first package requiring Node.js 20+; Node.js 22 or newer is recommended. |

### 🗺️ What Can I Do?

New here? This is the whole library in one view. Each row links to the section that shows the code.

| I want to… | Use | Read |
|---|---|---|
| Log in and stay logged in | `useMultiFileAuthState`, `usePostgresAuthState`, … | [Session Storage](#-session-storage) |
| Log in without scanning a QR | pairing code | [Pairing Code](#-pairing-code) |
| React to incoming messages | `messages.upsert` | [Receiving Messages](#-receiving-messages), [Events](#-events) |
| Send text, images, video, files, location, polls | `sock.sendMessage` | [Sending Messages](#-sending-messages) |
| Send buttons, lists, carousels | `Button`, `ButtonV2`, `Carousel` | [Integrated MessageBuilder](#-integrated-messagebuilder) |
| Send AI-style cards | `AIRich`, A2UI | [AIRich](#-airich), [A2UI Cards](#-a2ui-cards) |
| Read rich messages sent by other bots | `readRichMessage` | [Reading Rich Messages Back](#reading-rich-messages-back) |
| Post several photos as one message | album message | [Album Messages](#-album-messages) |
| Manage channels | channel helpers | [Newsletter / Channels](#-newsletter--channels) |
| Manage groups | `groupCreate`, `groupParticipantsUpdate`, … | [Group Management](#-group-management) |
| Manage communities | community helpers | [Communities](#-communities) |
| Block, unblock, report spam | `updateBlockStatus`, `reportSpam` | [Privacy Settings](#-privacy-settings) |
| Show typing, read receipts, presence | `sendPresenceUpdate`, `readMessages` | [Presence and Read Receipts](#-presence-and-read-receipts) |
| Pin, archive, mute, star chats | `chatModify` | [Chat State](#-chat-state) |
| Use business labels and catalogs | label and catalog helpers | [Labels](#-labels), [Business and Catalog](#-business-and-catalog) |
| Create call links, reject calls | `createCallLink`, `rejectCall` | [Calls](#-calls) |
| Call people and play audio | `makeVoipClient`, `voip.call` | [Placing a Voice Call](#placing-a-voice-call) |
| Play a queue of songs in a call | `playlist`, `enqueue`, `idle` | [Playing an Audio Queue](#playing-an-audio-queue) |
| Send video or share the screen in a call | `video: true`, `screenShare: true` | [Video Calls](#video-calls), [Screen Sharing](#screen-sharing) |
| Call a whole group at once | `voip.callGroup` | [Group Calls](#group-calls) |
| Read or change profile photos | profile photo helpers | [Profile Photos](#-profile-photos) |
| Schedule a message for later | scheduled messages | [Scheduled Messages](#-scheduled-messages) |
| Keep up with WhatsApp Web changes | `npm run wa:update` | [Updating the WhatsApp Web Version](#-updating-the-whatsapp-web-version) |
| Know when my number is in trouble | account health signals | [Account Health Signals](#-account-health-signals) |
| Understand LID versus PN JIDs | addressing helpers | [LID / PN / JID Addressing](#-lid--pn--jid-addressing) |
| Understand why `conversation` is empty | `normalizeMessageContent` | [All Message Types](#-all-message-types) |
| Fix what is broken | — | [Troubleshooting](#-troubleshooting) |

---

## 📚 Table of Contents

- [Overview](#-overview)
  - [Highlights](#-highlights)
  - [What Can I Do?](#-what-can-i-do)
- [Requirements](#-requirements)
- [Installation](#-installation)
- [Imports](#-imports)
- [Basic Connection](#-basic-connection)
- [Session Storage](#-session-storage)
- [Pairing Code](#-pairing-code)
- [Receiving Messages](#-receiving-messages)
- [Events](#-events)
- [LID / PN / JID Addressing](#-lid--pn--jid-addressing)
- [Sending Messages](#-sending-messages)
- [External Ad Reply](#-external-ad-reply)
- [Rich Link Cards](#-rich-link-cards)
- [Integrated MessageBuilder](#-integrated-messagebuilder)
- [Buttons, Lists, Carousels](#-buttons-lists-carousels)
- [AIRich](#-airich)
- [A2UI Cards](#-a2ui-cards)
- [HTML Mini Apps](#-html-mini-apps)
- [Album Messages](#-album-messages)
- [Status](#-status)
- [Newsletter / Channels](#-newsletter--channels)
- [Username and Info](#-username-and-info)
- [Group Management](#-group-management)
- [Communities](#-communities)
- [Privacy Settings](#-privacy-settings)
- [All Message Types](#-all-message-types)
- [Presence and Read Receipts](#-presence-and-read-receipts)
- [Chat State](#-chat-state)
- [Labels](#-labels)
- [Business and Catalog](#-business-and-catalog)
- [Calls](#-calls)
- [Profile Photos](#-profile-photos)
- [Useful Exports](#-useful-exports)
- [Updating the WhatsApp Web Version](#-updating-the-whatsapp-web-version)
- [Scheduled Messages](#-scheduled-messages)
- [Modern WhatsApp Message APIs](#-modern-whatsapp-message-apis)
- [Account Health Signals](#-account-health-signals)
- [Troubleshooting](#-troubleshooting)
- [Credits](#-credits)

---

## ⚙️ Requirements

- **Node.js 20 or newer** — declared in `package.json` and enforced by the `preinstall` check, so older versions are rejected at install time.
- **Node.js 22 or newer is recommended**, and **Node.js 24** for development and release workflows.
- npm.
- One WhatsApp account for pairing.

Check your Node.js version:

```bash
node -v
```

---

## 📦 Installation

Install directly from npm:

```bash
npm install zahan-baileys
```

### Recommended Setup

Use the package under its own name:

```json
{
  "type": "module",
  "dependencies": {
    "zahan-baileys": "latest"
  }
}
```

This package is ESM-first, so use `import` syntax instead of `require()`.

### Optional Media Packages

The base install does not ship an image or video processing library. That keeps the install about 45 MB smaller and leaves the choice of `sharp` build to you, without conflicting with a version already pinned in your project.

```bash
npm i sharp            # thumbnail, resize, MessageBuilder Toolkit.resize
npm i fluent-ffmpeg    # frame preview video, MessageBuilder Toolkit.getMp4Preview
```

Media handling uses whichever image library it can find, in this order:

| Package | Used for |
|---|---|
| `sharp` | first choice, fastest |
| `@napi-rs/image` | fallback |
| `jimp` | pure-JS fallback, no native build |

Sending plain text, buttons, polls, channels, and AI Rich messages does not need any of them. Sending media without all three throws `No image processing library available`; calling `Toolkit.resize` or `Toolkit.getMp4Preview` without the relevant package throws a message telling you what to install.

Check at runtime before relying on one of them:

```js
import { hasOptionalMedia } from 'zahan-baileys'

await hasOptionalMedia('sharp')          // false when it is not installed
await hasOptionalMedia('fluent-ffmpeg')
```

---

## 📥 Imports

```js
import makeWASocket from 'zahan-baileys'
```

Importing additional utilities:

```js
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Button,
  ButtonV2,
  Carousel,
  AIRich,
  Toolkit,
  MessageBuilder,
  MB
} from 'zahan-baileys'
```

> [!NOTE]
> MessageBuilder is integrated. You do not need to install `baileys-mbuilder` separately.

---

## 🚀 Basic Connection

```js
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from 'zahan-baileys'
import pino from 'pino'

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' })
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log('WhatsApp connected')
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut

      if (shouldReconnect) {
        startSock()
      } else {
        console.log('Session logged out')
      }
    }
  })

  return sock
}

startSock()
```

### Retry and Pairing Options

Pass `retryRequestDelayMs`, `maxMsgRetryCount`, and `connectTimeoutMs` to tune reconnects. Set `printQRInTerminal: true` when you want a QR code instead of a pairing code. `markOnlineOnConnect: false` keeps the socket from announcing presence as soon as it opens.

### Socket Options

Other useful options include `auth`, `logger`, `browser`, `version`, `getMessage`, `shouldSyncHistoryMessage`, `patchMessageBeforeSending`, `cachedGroupMetadata`, `userDevicesCache`, `linkPreviewImageThumbnailWidth`, and `generateHighQualityLinkPreview`.

### AnchorGuard (anti-crash / anti-ban)

The optional AnchorGuard package guards against crashes caused by malformed stanzas and helps avoid behaviour that gets accounts banned:

```bash
npm install @rexxhayanasi/elaina-anchorguard
```

```js
const sock = makeWASocket({
  auth: state,
  AnchorGuard: true,
  AnchorGuardConfig: {
    autoDelete: true,
    blockOnBug: true,
    revokeForEveryoneIfAdmin: true,
    kickOnBug: true,
    burstThreshold: 2,
    guardGroupAdds: true,
    metaAiNumbers: true,
    addWatchlist: []
  }
})
```

---

## 💾 Session Storage

Always persist credentials — without it you have to pair again on every restart:

```js
sock.ev.on('creds.update', saveCreds)
```

### Multi-file (default)

```js
import { useMultiFileAuthState } from 'zahan-baileys'

const { state, saveCreds } = await useMultiFileAuthState('./session')
```

### Single file

```js
import { useSingleFileAuthState } from 'zahan-baileys'

const { state, saveCreds } = await useSingleFileAuthState('./session.json')
```

### SQLite

```bash
npm i better-sqlite3
```

```js
import { useSqliteAuthState } from 'zahan-baileys'

const { state, saveCreds } = await useSqliteAuthState({ dbPath: './session.db' })
```

You can also pass an existing `better-sqlite3` database instance:

```js
import Database from 'better-sqlite3'

const database = new Database('./bot.db')
const { state, saveCreds } = await useSqliteAuthState({ database })
```

### PostgreSQL, MySQL, MongoDB, Redis

Install the driver for the database you want:

```bash
npm i pg        # PostgreSQL
npm i mysql2    # MySQL or MariaDB
npm i mongodb   # MongoDB
npm i ioredis   # Redis (node-redis works too)
```

Then build the auth state from a pool/client:

```js
import {
    usePostgresAuthState,
    useMySQLAuthState,
    useMongoAuthState,
    useRedisAuthState
} from 'zahan-baileys'

const { state, saveCreds } = await usePostgresAuthState({
    connectionString: 'postgres://user:pass@localhost:5432/bot'
})

const { state, saveCreds } = await useMySQLAuthState({
    uri: 'mysql://user:pass@localhost:3306/bot'
})

const { state, saveCreds } = await useMongoAuthState({
    uri: 'mongodb://localhost:27017',
    dbName: 'bot'
})

const { state, saveCreds } = await useRedisAuthState({
    uri: 'redis://localhost:6379'
})
```

With PostgreSQL, for example:

```js
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const { state, saveCreds } = await usePostgresAuthState({ pool, session: 'sales-bot' })
```

### NekoDB

```js
import { useNekoDBAuth } from 'zahan-baileys'

const { state, saveCreds } = await useNekoDBAuth(db)
```

The first argument must be a connected NekoDB instance; the collection defaults to `baileys_zahan_auth`. Pass a second argument to keep several sessions in one database:

```js
const { state, saveCreds } = await useNekoDBAuth(db, 'my_sessions')
```

### Caching Signal Keys

Every backend reads keys from disk or the database on each decryption. Wrapping the key store in a cache removes that round trip:

```js
import makeWASocket, { makeCacheableSignalKeyStore, useMultiFileAuthState } from 'zahan-baileys'
import pino from 'pino'

const logger = pino({ level: 'silent' })
const { state, saveCreds } = await useMultiFileAuthState('./session')

const sock = makeWASocket({
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, logger)
  },
  logger
})
```

### Storing Chats and Messages

`makeInMemoryStore` keeps chats, contacts, and messages in memory and binds itself to the socket event stream:

```js
import { makeInMemoryStore } from 'zahan-baileys'

const store = makeInMemoryStore({ logger })
store.readFromFile('./store.json')
setInterval(() => store.writeToFile('./store.json'), 10_000)

const sock = makeWASocket({
  auth: state,
  logger,
  getMessage: async (key) => (await store.loadMessage(key.remoteJid, key.id))?.message
})

store.bind(sock.ev)
```

---

## 🔐 Pairing Code

Log in without scanning a QR code:

```js
const phoneNumber = '6281234567890'

if (!state.creds.registered) {
  const code = await sock.requestPairingCode(phoneNumber)
  console.log('Pairing code:', code)
}
```

The number is normalised before use, so local formatting also works:

```js
await sock.requestPairingCode('081234567890')
// Boom 400: phoneNumber must be in international format:
// country code then national number, digits only
```

### The Request Is Server-Confirmed

`requestPairingCode` resolves only after WhatsApp's server confirms the registration, so a returned code is a real, usable code:

```js
try {
  const code = await sock.requestPairingCode(phoneNumber)
  console.log('Pairing code:', code)
} catch (error) {
  console.log(error.message)   // e.g. rate-overlimit, not-allowed
  console.log(error.data)      // e.g. 429
}
```

### One Code at a Time

A second request while one is pending is refused. Wait for the first code to expire or cancel it:

```js
try {
  await sock.requestPairingCode(phoneNumber)
} catch (error) {
  if (error.output?.statusCode === 409) {
    console.log('still pending, seconds left:', error.data.secondsLeft)
  }
}
```

```js
sock.cancelPairingCode()
const code = await sock.requestPairingCode(phoneNumber)
```

### Custom Pairing Code

Custom codes must be exactly 8 alphanumeric characters:

```js
const code = await sock.requestPairingCode(
  '6281234567890',
  'ZAHAN01'
)

console.log(code)
```

### Checking Pairing Without Touching a Running Bot

The helper script runs a single pairing request against a throwaway session directory:

```bash
node script/testpairing.js 6281234567890 --check-only
```

Use `--check-only` when logs may be visible to others; the code is never printed in that mode.

---

## 📩 Receiving Messages

`messages.upsert` fires for both live messages and history sync:

```js
sock.ev.on('messages.upsert', async ({ messages, type }) => {
  if (type !== 'notify') return

  const message = messages[0]
  if (!message?.message) return

  console.log('From:', message.key.remoteJid)
  console.log('Message:', message.message)
})
```

A minimal echo bot:

```js
sock.ev.on('messages.upsert', async ({ messages }) => {
  const m = messages[0]
  if (!m?.message) return

  const text =
    m.message.conversation ||
    m.message.extendedTextMessage?.text ||
    m.message.imageMessage?.caption ||
    m.message.videoMessage?.caption ||
    ''

  console.log(text)
})
```

---

## 📡 Events

All updates flow through `sock.ev`. You can also process events serially:

```js
sock.ev.process(async (events) => {
  if (events['messages.upsert']) { /* ... */ }
  if (events['connection.update']) { /* ... */ }
})
```

Important event groups:

- **Connection and credentials:** `connection.update`, `creds.update`, `messaging-history.set`, `connection.newMessageCount`.
- **Messages:** `messages.upsert`, `messages.update`, `messages.delete`, `messages.reaction`, `messages.media-update`, `message-receipt.update`.
- **Chats and contacts:** `chats.upsert`, `chats.update`, `chats.delete`, `contacts.upsert`, `contacts.update`, `presence.update`.
- **Groups and communities:** `groups.upsert`, `groups.update`, `group-participants.update`, `group.join-request`, `communities.update`.
- **Channels:** `newsletter.reaction`, `newsletter.view`, `newsletter-participants.update`, `newsletter-settings.update`.
- **Calls and voice:** `call`, `call.offer`, `call.accept`, `call.terminate`, `voip.state`.
- **Other:** `labels.edit`, `labels.association`, `blocklist.set`, `blocklist.update`, `lid-mapping.update`, `username.info`.

---

## 🪪 LID / PN / JID Addressing

WhatsApp now uses two kinds of address for the same account:

```text
6281234567890@s.whatsapp.net
123456789012345@lid
120363xxxxxxxxxx@g.us
123456789@newsletter
```

Use the `remoteJidAlt` / `senderAlt` fields when present, and never guess a phone number by swapping `@lid` for `@s.whatsapp.net`:

```js
const key = message.key

console.log('remoteJid:', key.remoteJid)
console.log('remoteJidAlt:', key.remoteJidAlt)
console.log('participant:', key.participant)
console.log('participantAlt:', key.participantAlt)
```

Addressing helpers:

```js
import { jidDecode, jidEncode, jidNormalizedUser } from 'zahan-baileys'

const normalized = jidNormalizedUser(jid)
const decoded = jidDecode(jid)

console.log(normalized)
console.log(decoded)
```

---

## 💬 Sending Messages

Everything is sent through `sock.sendMessage(jid, content, options)`.

### Text

```js
await sock.sendMessage(jid, {
  text: 'Greetings from Zahan 💜'
})
```

View-once text uses the extension wrapper:

```js
{ viewOnceMessageV2Extension: { message: { extendedTextMessage: { text, viewOnce: true } } } }
```

### Mentions (people and groups)

```js
await sock.sendMessage(jid, {
  text: 'Hello @628123456789',
  mentions: ['628123456789@s.whatsapp.net']
})
```

Group mentions are injected automatically for `@everyone`-style tokens:

```js
await sock.sendMessage(jid, {
  text: 'Check out this group',
  groupMentions: [{ groupJid: '120363XXXXXXXXXXXX@g.us', groupSubject: 'Group Name' }]
})
```

### Forwarded from a Channel

Add a `forwardedNewsletter` attribution so the message carries the channel card:

```js
await sock.sendMessage(jid, {
  text: 'Reposted from a channel',
  forwardedNewsletter: {
    newsletterJid: '120363XXXXXXXXXXXX@newsletter',
    serverMessageId: 42,
    newsletterName: 'Channel Name',
    contentType: 0
  }
})
```

### Image

```js
await sock.sendMessage(jid, {
  image: { url: 'https://example.com/image.jpg' },
  caption: 'Zahan Image'
})
```

### Video

```js
await sock.sendMessage(jid, {
  video: { url: 'https://example.com/video.mp4' },
  caption: 'Video Zahan'
})
```

### Document

```js
await sock.sendMessage(jid, {
  document: { url: 'https://example.com/file.pdf' },
  fileName: 'document.pdf',
  mimetype: 'application/pdf'
})
```

### Location

```js
await sock.sendMessage(jid, {
  location: {
    degreesLatitude: 6.927079,
    degreesLongitude: 79.861243,
    name: 'Colombo',
    address: 'Colombo, Sri Lanka'
  }
})
```

### Poll

```js
await sock.sendMessage(jid, {
  poll: {
    name: 'Choose one',
    values: ['Option A', 'Option B', 'Option C'],
    selectableCount: 1
  }
})
```

Poll options and multiple-answer behaviour:

```js
 await conn.sendMessage(jid, {
  poll: {
    name: 'Which one do you like?',
    values: [
  { name: 'Curry Rice', image: { url: global.zahan } },
  { name: 'Fried Rice', image: { url: global.zahan } }
],
    selectableCount: 1,
    hideVoter: true,
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
  }
})
```

Photo polls are gated client-side; use the helper to check whether a receiver can render one:

```text
isPhotoPollReceiverEnabled(msg) =
  isNewsletterMsg({ from: msg.from, to: msg.to }) && isNewsletterPhotoPollsReceiverEnabled()
```

---

## 📰 External Ad Reply

A message can carry the card that WhatsApp shows when someone clicks a Click-to-WhatsApp ad:

```js
await sock.sendMessage(jid, {
  text: 'Zahan Baileys',
  contextInfo: {
    externalAdReply: {
      title: 'Zahan Baileys',
      body: 'Library WhatsApp Multi-Device modern',
      mediaType: 1,
      thumbnailUrl: 'https://example.com/zahan.jpg',
      sourceUrl: 'https://www.npmjs.com/package/zahan-baileys',
      renderLargerThumbnail: true,
      showAdAttribution: false
    }
  }
})
```

```js
await sock.sendMessage(jid, {
  text: 'Zahan Baileys',
  externalAdReply: {
    title: 'Zahan Baileys',
    body: 'Library WhatsApp Multi-Device modern',
    thumbnail: await fs.promises.readFile('./cover.jpg'),
    url: 'https://www.npmjs.com/package/zahan-baileys',
    largeThumbnail: true
  }
})
```

### Why the Card May Not Appear at All

The client only renders the card when the ad context resolves on the receiving side:

```js
if (!isSMB() && !getIsSentByMe(t) && r != null
    && getABPropConfigValue("ctwa_suppress_message_with_external_ad_reply_consumer_db_level_enabled"))
  throw new MessageValidationError("This is a spam message sent to consumer number with externalAdReply", INVALID_MESSAGE)
```

### Click-to-WhatsApp: the Shape Actually Sent When an Ad Is Clicked

```js
import { proto } from 'zahan-baileys'

await sock.sendMessage(jid, {
  text: 'Hello, I have a question about your promotion',
  contextInfo: {
    conversionSource: 'FB_Ads',
    conversionData: Buffer.from('120210000000000000'),
    conversionDelaySeconds: 3,
    externalAdReply: {
      sourceType: 'ad',
      sourceId: '120210000000000000',
      sourceUrl: 'https://fb.me/1a2b3c4d5e',
      sourceApp: 'facebook',
      ctwaClid: 'AbQ1kZ8xR2mNpL7vT0yUwE',
      title: '50% off every item',
      body: 'Valid until the end of the month',
      mediaType: proto.ContextInfo.ExternalAdReplyInfo.MediaType.IMAGE,
      thumbnailUrl: 'https://example.com/promo.jpg',
      renderLargerThumbnail: true,
      showAdAttribution: true,
      containsAutoReply: true,
      automatedGreetingMessageShown: true,
      greetingMessageBody: 'Hello, I have a question about your promotion',
      ctaPayload: 'promo_bulan_ini',
      adType: proto.ContextInfo.ExternalAdReplyInfo.AdType.CTWA,
      containsCtwaFlowsAutoLabel: true
    }
  }
})
```

### The Card and the "via ad" Label Are Two Different Things

```js
n.alwaysShowAdAttribution = contextInfo.alwaysShowAdAttribution
n.conversionSource        = contextInfo.conversionSource
n.conversionDelaySeconds  = contextInfo.conversionDelaySeconds
n.conversionData          = ctwaSignals != null && ctwaPayload != null ? ctwaPayload : conversionData
const d = contextInfo.externalAdReply
if (d != null) {
  n.sourceUrl = d.sourceUrl, n.title = d.title, n.description = d.body
  n.thumbnail = decodeBytes(d.thumbnail), n.thumbnailUrl = d.thumbnailUrl
  n.mediaType = d.mediaType, n.mediaUrl = d.mediaUrl
  n.isSuspiciousLink = findLink(d.sourceUrl).suspiciousCharacters.size > 0
  // then sourceApp, and greetingMessageBody / automatedGreetingMessageShown / ctaPayload
  // only when isWamoAGMIntegrationEnabled(d.sourceApp)
}
```

```js
if (ctwaContext == null
    || ctwaContext.sourceUrl == null
    || ctwaContext.mediaType === MediaType.NONE
    || (ctwaContext.adContextPreviewDismissed === true && isHideAdContextIfSoftDismissed()))
  return null
```

### Never Set `alwaysShowAdAttribution` from a Bot

```js
function D(msg) {
  const n = msg.ctwaContext?.alwaysShowAdAttribution
  if (!isSMB() && !isMeAccount(getSender(msg)) && n === true)
    throw new MessageValidationError("This is a spam message sent to consumer number with 'Message Via Ad' header", INVALID_MESSAGE)
}
```

---

## 🖼️ Rich Link Cards

A large link preview card can be attached to any text message, even when the body itself has no link:

```js
await sock.sendMessage(jid, {
  richLink: {
    text: 'listen to this',
    url: 'https://example.com/track',
    title: 'Song Title',
    description: 'Singer',
    image: { url: './cover.jpg' }
  }
})
```

The client decides whether a preview is large from the thumbnail it receives:

```js
var n = !!(e.thumbnailDirectPath || e.thumbnailHQ) && e.thumbnailHeight != null && e.thumbnailWidth != null;
if (!n) return false;
```

You can also pass a fully-built preview object:

```js
await sock.sendMessage(jid, {
  text: 'see https://example.com/a',
  linkPreview: {
    'matched-text': 'https://example.com/a',
    title: 'Title',
    description: 'Description',
    image: { url: './cover.jpg' }
  }
})
```

Or a small card, with the link omitted from the body:

```js
await sock.sendMessage(jid, {
  text: 'no link here',
  linkPreview: {
    'matched-text': 'https://example.com',
    title: 'Title',
    description: 'Description',
    image: { url: './cover.jpg' }
  }
})
```

The client decides whether a message carries a preview through `isUrlExtendedTextMessage` — that is, `!!matchedText || !!description || !!title`. The message body is never inspected. A large card needs an `upload` function (the socket provides one) and an image library to scale the thumbnail.

---

## 🧱 Integrated MessageBuilder

MessageBuilder ships inside `zahan-baileys`.

### One Import, the Entire Builder

The builder surface spans more than two hundred names across four modules. `MB` (long form: `MessageBuilder`) carries all of them — the builder classes, section and item factories, enums, native-flow checkers, and signature helpers:

```js
import { MB } from 'zahan-baileys'

await new MB.Button(sock)
  .setTitle('Zahan Menu')
  .addReply('Ping', 'ping')
  .send(jid)

const rich = new MB.AIRich(sock)
rich.addText('*Report*')
rich.addSection(MB.dividerSection())
rich.addSection(MB.taskSection({ taskId: 'job-1', title: 'Rendering', status: MB.TaskStatus.RUNNING }))
await rich.send(jid)

MB.checkNativeFlowButtons([{ name: 'single_select' }])
```

The long import list still works and nothing is deprecated:

```js
import {
  Button,
  ButtonV2,
  Carousel,
  AIRich,
  Toolkit,
  MessageBuilder,
  MB,
  MESSAGE_BUILDER_VERSION,
  AIRichError,
  ItemNotFoundError,
  DuplicateIdError,
  InvalidTargetError,
  ContentValidationError
} from 'zahan-baileys'
```

---

## 💸 Split Payment and Reminders

Both render as their own bubble on Android. Amounts are human numbers — the wire value is scaled by `offset` (default 1000), so passing a pre-scaled number produces a bill a thousand times too large.

```js
import { SplitPaymentStatus, ReminderFrequency } from 'zahan-baileys'

await sock.sendMessage(jid, {
  splitPayment: {
    splitId: 'dinner-01',
    total: 150000,
    currency: 'IDR',
    description: 'Dinner together',
    requesterJid: '628xxxx@s.whatsapp.net',
    participants: [
      { jid: '6281xxxx@s.whatsapp.net', amount: 50000 },
      { jid: '6282xxxx@s.whatsapp.net', amount: 100000, status: SplitPaymentStatus.PAID }
    ]
  }
})

await sock.sendMessage(jid, {
  splitPaymentUpdate: { splitId: 'dinner-01', participantJid: '6281xxxx@s.whatsapp.net' }
})

await sock.sendMessage(jid, {
  paymentReminder: {
    reminderId: 'rent-01',
    description: 'Monthly rent',
    amount: 500000,
    currency: 'IDR',
    frequency: ReminderFrequency.MONTHLY
  }
})
```

`splitId` is required and is referenced by update messages. Participants default to `PENDING`, and `createdAt` is stamped for you. Reminders default to `ACTIVE` and accept `WEEKLY`, `BI_WEEKLY`, `MONTHLY`, or `QUARTERLY`. Read them back with `readSplitPayment(msg)`, `readPaymentReminder(msg)`, `money(amount, code)`, and `readMoney(value)`.

These are ordinary messages sent by your own account. They do **not** move money and are not network-enforced payment requests — treat the split card as a note.

---

## 📊 Link Preview Style in Status

`statusLinkPreviewMetadata` sits next to the text at the top of the message and tells status which link preview style to draw:

```js
await sock.sendMessage('status@broadcast', {
  text: 'read this https://example.com/article',
  statusLinkPreview: { style: 1 }
})
```

The client does not publish names for these values, so the number is passed through as-is rather than inventing an enum. Negative or non-integer styles are rejected.

---

## 🎬 Reading Social Link Previews

When a Meta client sends a preview for a reel or post, it adds extra nodes next to the usual title and thumbnail. `readSocialPreview(msg)` pulls them back out:

```js
import { readSocialPreview } from 'zahan-baileys'

sock.ev.on('messages.upsert', ({ messages }) => {
  for (const msg of messages) {
    const social = readSocialPreview(msg)
    if (social) console.log(social.postType, social.videoUrl, social.endCards)
  }
})
```

There is deliberately **no sender-side recipe here**. `socialPreview` and `videoEndCard` still encode correctly, but no observed client renders them from a message you send, so documenting them as a way to build a card would be documenting an empty message. For a card that really renders, use [Rich Link Cards](#-rich-link-cards) or the `linkPreview` option on a plain text message.

---

## 🔘 Buttons, Lists, Carousels

### Quick Reply + URL + Copy

```js
import { MB } from 'zahan-baileys'

const message = new MB.Button(sock)
  .setTitle('Zahan Menu')
  .setBody('Choose one of the options below.')
  .setFooter('zahan-baileys')
  .addReply('Ping', 'ping')
  .addUrl('Open Website', 'https://example.com')
  .addCopy('Copy Code', 'ZAHAN2026')

await message.send(jid)
```

### Button with an Image

```js
const message = new MB.Button(sock)
  .setImage('https://example.com/zahan.jpg')
  .setTitle('Zahan')
  .setBody('Interactive message with an image header.')
  .setFooter('Powered by Zahan Baileys')
  .addReply('Menu', 'menu')
  .addUrl('Website', 'https://example.com')

await message.send(jid)
```

### Button Helper Reference

```js
.addReply(displayText, id)
.addUrl(displayText, url)
.addCopy(displayText, copyCode)
.addCall(displayText, id)
.addReminder(displayText, id)
.addCancelReminder(displayText, id)
.addAddress(displayText, id)
.addLocation(options)
.addSelection(title, options)
.addButton(name, params)
```

```js
.setTitle(text)
.setSubtitle(text)
.setBody(text)
.setFooter(text)
.setImage(urlOrBuffer)
.setVideo(urlOrBuffer)
.setDocument(urlOrBuffer)
.setMedia(object)
.setContextInfo(object)
.addPayload(object)
.clearButtons()
.setParams(object)
.build(jid)
.send(jid)
```

### Selection / List

```js
const list = new MB.Button(sock)
  .setTitle('Zahan Menu')
  .setBody('Choose one menu item.')
  .setFooter('Zahan Baileys')
  .addSelection('Open Menu')
  .makeSection('Main Menu')
  .makeRow('', 'Profile', 'Open the profile menu', 'profile')
  .makeRow('', 'Settings', 'Open the settings menu', 'settings')
  .makeSection('More')
  .makeRow('', 'About', 'About this bot', 'about')

await list.send(jid)
```

### Native Flow Support

```js
import { MB } from 'zahan-baileys'

MB.checkNativeFlowButtons([{ name: 'single_select' }])
// { ok: false, unsupported: ['single_select'], problems: ['"single_select" is not a native flow WhatsApp Web or iOS can render, only Android shows it'] }

MB.isWebSupportedButtonName('quick_reply')  // true
```

### ButtonV2

```js
import { MB } from 'zahan-baileys'

const message = new MB.ButtonV2(sock)
  .setTitle('Zahan')
  .setSubtitle('WhatsApp Bot')
  .setBody('Choose one action.')
  .setFooter('Zahan Baileys')
  .setThumbnail('https://example.com/zahan.jpg')
  .addButton('Menu', 'menu')
  .addButton('Ping', 'ping')

await message.send(jid)
```

### Carousel

```js
import { MB } from 'zahan-baileys'

const card1 = await new MB.Button(sock)
  .setImage('https://example.com/card1.jpg')
  .setBody('First card')
  .addReply('Choose', 'card_1')
  .toCard()

const card2 = await new MB.Button(sock)
  .setImage('https://example.com/card2.jpg')
  .setBody('Second card')
  .addUrl('Open', 'https://example.com')
  .toCard()

const carousel = new MB.Carousel(sock)
  .setBody('Choose one of the cards below.')
  .setFooter('Zahan Carousel')
  .addCard([card1, card2])

await carousel.send(jid)
```

---

## 🤖 AIRich

`AIRich` builds rich responses made of sections. Start with a title, add sections, then send:

```js
import { MB } from 'zahan-baileys'

const rich = new MB.AIRich(sock)
rich.addText('Hello')
await rich.send(jid)
```

### Text + Code + Table

```js
import { MB } from 'zahan-baileys'

const rich = new MB.AIRich(sock)
  .setTitle('Zahan AI')
  .setFooter('Made with AIRich')
  .addText('Hello! This is a rich response.')
  .addCode('javascript', `console.log('Hello Zahan')`)
  .addTable([
    ['Feature', 'Status'],
    ['Button', 'Available'],
    ['Carousel', 'Available'],
    ['AIRich', 'Experimental']
  ])
  .addSuggest(['View menu', 'Help me', 'About Zahan'])

await rich.send(jid)
```

### Why a Card May Not Appear at All

Rich responses are gated client-side:

```js
: n && o("WAWebBotBaseGating").isRichResponseForwardReceivingEnabled() ? n : u || null
```

### Why Only the Title Appears

```js
const msg = await rich.send(jid)                          // auto: proof omitted
msg.aiVerification   // 'omitted'   = no proof, status UNKNOWN (default)
                     // 'placeholder' = fake proof, status FAILED (opt-in)
                     // 'preserved'   = genuine Meta signature, status VALID
```

Section factories must produce a valid `__typename`; the builder stamps missing ones before sending:

```js
.addText(text)
.addCode(language, code)
.addTable(rows)
.addSource(sources)
.addReels(items)
.addImage(imageUrl, options)
.addVideo(videoUrl, options)
.addProduct(data)
.addPost(data)
.addTip(text)
.addSuggest(suggestion, options)
.addFOAText(text)
.addMetadata(text)
.addWidget(data, options)
.addFooterAction(data, options)
.addSection(section)
.addSubmessage(submessage)
```

### What Can Be Mixed With What

Top-level content keys are mutually exclusive:

```js
proto.Message.encode({ richResponseMessage, interactiveMessage }).finish()
// keys on the wire : interactiveMessage, richResponseMessage
// getContentType() : interactiveMessage        <- the rich response is ignored
```

Inside `interactiveMessage`, three slots participate and compete:

```js
InteractiveMessageType = { NATIVE_FLOW: 'nativeFlowMessage', SHOPS_STOREFRONT: 'shopStorefrontMessage', CAROUSEL: 'carouselMessage' }
getInteractiveMessageTypeForProto = f => members().find(t => fieldNameFor(t) in f)
```

```js
isSupportedInteractiveMessageVersion(type, payload) {
  const n = payload?.messageVersion
  if (n == null || type == null) return false
  switch (type) { case NATIVE_FLOW: return n <= 1; case SHOPS_STOREFRONT: return n <= 1; case CAROUSEL: return n <= 1 }
}
```

Button constraints decide which layout the client chooses:

```js
getBizNativeFlowName = ({ interactiveMessage: m }) => {
  const p = m?.nativeFlowMessage?.buttons
  if (p?.length > 0 && !buttonsViolateButtonImprovementsConstraints(p.map(b => ({ nativeFlowButton: b }))))
      return MB.getNativeFlowNameByButtonName(p[0].name)          // <- the only branch the bot reaches
  if (e.buttonsMessage?.buttons?.length === 1) return …          // legacy buttonsMessage
  const f = !(p?.length) && (body.text || header.title || footer.text || header.imageMessage) && !m?.shopStorefrontMessage
  if (f) return MIXED                                            // <- only when there is NO button
  // otherwise: undefined
}
```

```js
const QUICK_REPLY_LIMIT = 10, OTHER_LIMIT = 3
const SUPPORTED = [QUICK_REPLY, CTA_CALL, CTA_URL, CTA_CATALOG, CATALOG_MESSAGE, CTA_COPY_CODE, CTA_FLOW,
                   ORDER_STATUS, PAYMENT_REMINDER, BOOKING_CONFIRMATION, PAYMENT_REQUEST,
                   API_SIGNUP, INAPP_SIGNUP, CTA_APP, FORM_MESSAGE]

const isQuickReply = b => b.nativeFlowButton?.name === String(QUICK_REPLY)

buttonsViolateButtonImprovementsConstraints = e => {
  if (e.length === 0) return false
  const firstIsQR = isQuickReply(e[0])
  if (e.length > (firstIsQR ? QUICK_REPLY_LIMIT : OTHER_LIMIT)) return true
  return !e.slice(1).every(b => {
    const mapped = MB.getNativeFlowNameByButtonName(b.nativeFlowButton?.name)
    return (mapped != null ? SUPPORTED.includes(mapped) : true) && firstIsQR === isQuickReply(b)
  })
}
```

```js
isValidNativeFlowName = ({ bizInfo, msgContext, name }) => {
  if (msgContext !== 'relay' && name != null) return true
  const a = bizInfo?.nativeFlowName
  if (a == null || name == null) return false            // <- undefined name, before anything else
  return cast(a) === MIXED || … ? true : cast(a) === name
}
```

```xml
<biz actual_actors="2" host_storage="2" privacy_mode_ts="…">
  <interactive type="native_flow" v="1">
    <native_flow v="9" name="mixed"/>
  </interactive>
  <quality_control decision_id="…" source_type="third_party">…</quality_control>
</biz>
```

```js
const text = '✨ MENU ZAHAN\n\nChoose a category below.'

await sock.sendMessage(jid, {
  text: text,
  footer: 'Zahan - MultiDevice',
  nativeFlow: [
    { text: 'All Items', id: '.allmenu' },
    { text: 'Downloader', id: '.menu downloader' },
    { text: 'Sticker', id: '.menu sticker' }
  ],
  optionText: 'Choose Category',
  optionTitle: 'Category',
  bloksWidget: {
    type: 'im_a2ui',
    uuid: crypto.randomUUID(),
    fallback: text,
    data: JSON.stringify({ type: 'info_card', title: '✨ MENU ZAHAN', body: 'Choose a category below.' })
  }
})
```

```js
await sock.sendMessage(jid, {
  text: 'Every button type in one message',
  footer: 'Zahan - MultiDevice',
  nativeFlow: [
    { text: 'Reply', id: '.menu' },
    { text: 'Site', url: 'https://nixel.dev' },
    { text: 'Call', call: '+628000000000' },
    { name: 'send_location', buttonParamsJson: '' },
    { text: 'Choose', sections: [{ title: 'Category', rows: [{ title: 'Downloader', id: '.menu downloader' }] }] }
  ]
})
```

```js
await sock.sendMessage(jid, {
  text: 'Important link',
  nativeFlow: [
    { text: 'Site', url: 'https://nixel.dev' },
    { text: 'Channel', url: 'https://whatsapp.com/channel/xxxx' }
  ]
})
```

Inside `richResponseMessage`, everything can be mixed:

```js
import { MB } from 'zahan-baileys'

const rich = new MB.AIRich(sock).setTitle('Zahan AI')

rich.addText('*Statistics for today*')
rich.addSection(MB.bloksSection('im_a2ui', { type: 'info_card', title: 'Sales', body: 'Rp 1.250.000' }))

await rich.send(jid)
```

### Inline Entities Inside Text

```js
import { MB } from 'zahan-baileys'

const rich = new MB.AIRich(sock).setTitle('Zahan AI')

rich.addText('open [Settings](>whatsapp://settings), or see [the site](https://nixel.dev)')

await rich.send(jid)
```

```js
rich.addText(text, { deeplink: false })
rich.addText(text, { hyperlink: false, citation: false, latex: false })
rich.addText(text, { extract: false })
```

```js
import { MB } from 'zahan-baileys'

const info = MB.decodeAIRich(m.message)
const inline = info.sections.flatMap(s => s.view_model?.primitive?.inline_entities ?? [])
console.log(inline.map(e => e.metadata.__typename))
```

### Editing a Message That Is Already Displayed

```js
import { MB } from 'zahan-baileys'

const rich = new MB.AIRich(sock)
  .setTitle('Zahan AI')
  .addText('Working on it…', { id: 'intro' })

await rich.send(jid)

rich.addImage('', { status: 'GENERATING', update_text: 'Generating image…', insertAt: 'intro', id: 'pic' })
await rich.sendEdit()

rich.addImage('https://example.com/result.jpg', { replace: 'pic' })
await rich.sendEdit()
```

```js
rich.getIds()          // [ 'intro', 'pic' ]
rich.hasId('pic')      // true
rich.peek('pic')       // the node behind that id
rich.assignId(0, 'first')  // names an item that has no id yet
rich.delete('pic')
```

### Mixing Instances

```js
const cards = new MB.AIRich(sock)
  .addProduct({ title: 'Zahan', brand: 'Baileys', product_url: 'https://example.com' })
  .addPost({ username: 'zahan', caption: 'Hello', url: 'https://example.com' })
  .items

rich.addSection(MB.newLayout('HScroll', cards), { id: 'mixed' })
await rich.sendEdit()
```

### Reading Existing Messages

```js
const rich = new MB.AIRich(sock).loadFrom(m.message)
const button = new MB.Button(sock).loadFrom(m.message)
const carousel = new MB.Carousel(sock).loadFrom(m.message)
const buttonV2 = new MB.ButtonV2(sock).loadFrom(m.message)
```

### Primitives Without a Helper

Use `customSection` for anything not modelled by a factory:

```js
import { MB } from 'zahan-baileys'

const rich = new MB.AIRich(sock)
  .setTitle('Zahan AI')
  .setFooter('Made with AIRich')

rich.addText('*Render report*')
rich.addSection(MB.dividerSection(), { id: 'rule' })
rich.addSection(MB.spacerSection({ spacing: 3 }))
rich.addSection(MB.imageSection('https://example.com/photo.jpg'))
rich.addSection(MB.taskSection({ taskId: 'job-1', title: 'Rendering', subtitle: 'frame 12/60', status: MB.TaskStatus.RUNNING }))
rich.addSection(MB.latexSection('E = mc^2'))
rich.addSection(MB.thinkingSection('Searching the web…', { icon: MB.ThinkingIcon.WEB_SEARCH }))
rich.addSection(MB.progressSection('Almost done', { inProgress: false }))

await rich.send(jid)
```

### The Rest of the Meta AI Catalog

```js
await MB.sendAIRichMessage(sock, jid, {
    text: 'Hello from AIRichMessage',
    submessages: [
        MB.AIRichMessage.inlineImage({ previewUrl: 'https://x/y.jpg', highResUrl: 'https://x/y-hi.jpg' }),
        MB.AIRichMessage.table({ rows: [{ items: ['Price', '10'], isHeading: true }] })
    ]
})
```

Sub-nodes inside a primitive are built from submessages, not from sections:

```js
const info = MB.decodeAIRich(msg)

info.typenames      // only section-level primitives, as before
info.allTypenames   // every __typename in the whole tree, at any depth
```

```js
import { MB } from 'zahan-baileys'

const rich = new MB.AIRich(sock).setTitle('Zahan AI')

rich.addSection(MB.mapSection({
  staticMapUrl: 'https://example.com/static-map.png',
  motivation: 'Places to eat near you',
  items: [
    MB.placeItem({
      id: '1',
      name: 'Corner Cafe',
      rating: 4.6,
      latitude: -6.2,
      longitude: 106.8,
      categoryName: 'Restaurant'
    })
  ]
}))

rich.addSection(MB.sportsSection({
  gameId: 'g-1',
  league: MB.SportsLeague.EURO,
  status: MB.SportsGameStatus.LIVE,
  statusDetail: "72'",
  homeTeam: { name: 'Sri Lanka', abbreviation: 'LKA' },
  awayTeam: { name: 'India', abbreviation: 'IND' },
  homeScore: 2,
  awayScore: 1
}))

rich.addSection(MB.actionListSection([
  MB.actionListRow({ title: 'Open map', url: 'https://maps.example.com' }),
  MB.actionListRow({ title: 'Call', action: 'tel:+62800000000' })
]))

rich.addSection(MB.searchPlannerSection({
  queryUrl: 'https://search.example.com?q=weather',
  steps: [
    MB.plannerStep({ title: 'Search weather', status: MB.SearchPlannerStepStatus.COMPLETED }),
    MB.plannerStep({ title: 'Summarise results', status: MB.SearchPlannerStepStatus.IN_PROGRESS })
  ]
}))

await rich.send(jid)
```

```js
import { MB } from 'zahan-baileys'

const rich = new MB.AIRich(sock).setTitle('Zahan AI')

rich.addText('*Places to eat near you*')
rich.addMap([
  { latitude: -6.2088, longitude: 106.8456, title: 'Corner Cafe', body: 'Local restaurant' },
  { latitude: -6.2150, longitude: 106.8500, title: 'Uncle Burgers', body: 'Beef burgers' }
])

await rich.send(jid)
```

```js
import { MB } from 'zahan-baileys'

const rich = new MB.AIRich(sock).setTitle('Zahan AI')

rich.addSection(MB.mediaGridSection([
  MB.mediaItem({ previewUrl: 'https://example.com/1-small.jpg', fullUrl: 'https://example.com/1.jpg' }),
  MB.mediaItem({ previewUrl: 'https://example.com/2-small.jpg', fullUrl: 'https://example.com/2.jpg' })
]))

rich.addSection(MB.contextualSourcesSection([
  { url: 'https://example.com/a', title: 'Source A', favicon: 'https://example.com/a.ico' }
]))

await rich.send(jid)
```

The subscription-offer card has a verified wire shape:

```js
import { MB } from 'zahan-baileys'

const rich = new MB.AIRich(sock).setTitle('Zahan AI')

rich.addSection(MB.quotaUpsellSection({
  title: 'Meta AI Plus',
  body: 'Your image quota is used up',
  bodyLine1: 'Upgrade for 100 more images',
  bodyLine2: 'Cancel any time',
  meterUsageType: 'META_AI_IMAGINE',
  benefitType: 'IMAGINE_QUOTA',
  buttons: [MB.quotaUpsellButton({ label: 'Upgrade', action: 'UPGRADE', deeplink: 'https://meta.ai/plus' })]
}))

await rich.send(jid)
```

Two primitives have no readable field names yet, so there is no factory for them:

```js
import { MB } from 'zahan-baileys'

const rich = new MB.AIRich(sock).setTitle('Zahan AI')

rich.addSection(MB.customSection('GenAISourcedItem', { sourced_item_type: 'THREADS_POST' }))
rich.addSection(MB.customSection('GenAITopicLinkItem', { title: 'Bali' }, { layout: 'HScroll' }))

await rich.send(jid)
```

### Relaying a Genuine Meta AI Answer

The client verifies forwarded bot messages against its own root certificate (`CN=Meta WA Feature Root CA`, ECDSA P-256, exported as `BOT_SIGNATURE_ROOT_CERTIFICATE`). The signed payload is short — `version ("1") || fbid bot || byte unified response` — so relaying those three values unchanged preserves the proof:

```
version ("1")  ||  fbid bot  ||  byte unified response
```

```js
import { MB } from 'zahan-baileys'

sock.ev.on('messages.upsert', async ({ messages }) => {
  for (const msg of messages) {
    if (MB.verifyRichResponseSignature(msg).status !== 'passed') continue
    await MB.forwardRichResponse(sock, '120363xxxx@g.us', msg, { quoted: msg })
  }
})
```

`contextInfo` is not part of the signed payload, so quotes and mentions are free to change; the unified response bytes, the proof, and `forwardedAiBotMessageInfo.botJid` are not. **Any edit invalidates the signature** — after `addText`, `addSection`, `delete`, `setResponseId`, and friends, the build falls back to freshly serialised JSON with placeholder metadata. Relay, or load-and-resend, if you need the proof to survive.

### Reading Rich Messages Back

```js
import { MB } from 'zahan-baileys'

sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
        const rich = MB.readRichMessage(msg)
        if (!rich) continue
        console.log(rich.kind, rich.text)
    }
})
```

### Inspecting a Received AI Rich Message

```js
import { MB } from 'zahan-baileys'

const info = MB.decodeAIRich(m.message)
console.log(info.layouts)     // [ 'Single', 'HScroll' ]
console.log(info.typenames)   // [ 'GenAIMarkdownTextUXPrimitive', 'GenAIProductItemCardPrimitive' ]
console.log(info.sections)
```

---

## 🃏 A2UI Cards

A2UI cards are built as a surface with a component tree:

```js
await MB.sendA2UIBloks(sock, jid, [
    MB.a2uiColumn('root', ['img', 't1']),
    MB.a2uiImage('img', 'https://example.com/media.jpg'),
    MB.a2uiText('t1', 'Zahan Bot')
], { uuid: crypto.randomUUID() })
```

```js
await MB.sendA2UI(sock, jid, [], {
    type: 'im_a2ui',
    uuid: crypto.randomUUID(),
    fallback: '✨ MENU ZAHAN\nChoose a category below.',
    data: MB.a2uiInfoCard({ title: '✨ MENU ZAHAN', body: 'Choose a category below.' })
})
```

```js
import { MB } from 'zahan-baileys'

await MB.sendA2UI(sock, jid, [
    MB.a2uiColumn('root', ['card_image', 'card_title', 'card_body']),
    MB.a2uiImage('card_image', 'https://example.com/header.jpg'),
    MB.a2uiText('card_title', 'Welcome!', { variant: 'h1' }),
    MB.a2uiText('card_body', 'Glad you are here.')
], {
    buttons: [{
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({ display_text: 'Join Group', url: 'https://chat.whatsapp.com/…' })
    }]
})
```

```js
{
  version: 'v0.9',
  createSurface: {
    surfaceId: 'card-<uuid>',
    root: 'root',
    components: [ … ]
  }
}
```

---

## 🌐 HTML Mini Apps

### `sendHtmlApp`

```js
import { MB } from 'zahan-baileys'

const rich = new MB.AIRich(sock).setTitle('Dashboard')

rich.addSection(MB.htmlSection(html, { typename: MB.AI_RICH_HTML_PRIMITIVE_CLASS }))

await rich.send(jid)
```

```js
import { MB } from 'zahan-baileys'
import { readFileSync } from 'node:fs'

await MB.sendHtmlApp(sock, m.chat, readFileSync('./dino.html', 'utf8'), {
  title: 'NIXEL DINO',
  label: 'Dino Runner',
  trustedSources: ['nixel.dev']
})
```

```
MB.sendHtmlApp(sock, jid, html, options?) => Promise<WAMessage>
```

```js
contextInfo: {
  forwardingScore: 1,
  isForwarded: true,
  forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
  forwardOrigin: 4
}
```

### `htmlSection`

```js
import { MB } from 'zahan-baileys'

const rich = new MB.AIRich(sock)
rich.setTitle('Dashboard')
rich.addText('Sales today')
rich.addSection(MB.dividerSection())
rich.addSection(MB.htmlSection(chartHtml, { trustedSources: ['nixel.dev'] }), { id: 'chart' })
await rich.send(m.chat)
```

```
MB.htmlSection(html, { trustedSources?, height? }) => section
```

### What the WebView Actually Provides

```
localStorage   THROW SecurityError
sessionStorage THROW SecurityError
cookie         THROW SecurityError
indexedDB.open THROW SecurityError
caches         undefined
```

### Writing HTML That Behaves in the WebView

```js
await MB.sendHtmlApp(sock, m.chat, html, { height: 300 })
```

```js
window.AndroidBridge.updateSize(520)
```

```css
#wrap { width: 100%; height: 300px; overflow: hidden }
#game { width: 312px; height: 106px }
```

```js
let rafId = null, running = true
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    running = false
    if (rafId) cancelAnimationFrame(rafId)
    rafId = null
  } else if (!running) {
    running = true
    last = 0
    rafId = requestAnimationFrame(loop)
  }
})
```

```js
rq.onsuccess = () => {
  const db = rq.result
  const tx = db.transaction('kv', 'readwrite')
  tx.objectStore('kv').put(value, 'best')
  tx.oncomplete = () => db.close()
  tx.onerror = () => db.close()
}
```

```js
const W = 560, H = 190
const dpr = Math.min(devicePixelRatio || 1, 3)
canvas.width = W * dpr
canvas.height = H * dpr
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
```

```js
canvas.addEventListener('pointerdown', e => { e.preventDefault(); jump() })
document.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); jump() } })
```

### Reading a Mini App Back

```js
const rich = MB.decodeAIRich(msg)
const section = rich?.sections.find(s => s.view_model?.primitive?.__typename === MB.AI_RICH_HTML_PRIMITIVE)
if (section) {
  const html = section.view_model.primitive.payload
}
```

```js
import { MB } from 'zahan-baileys'
```

---

## 🖥️ Embedded Screens

A complete example:

```js
import { MB } from 'zahan-baileys'

const gameHtml = `
<body style="margin:0;background:transparent;color:#eee;font-family:Arial">
  <canvas id="game" width="560" height="190" style="width:100%;height:auto"></canvas>
  <script>
    const x = document.getElementById('game').getContext('2d')
    x.fillStyle = '#6c5ce7'
    x.fillRect(20, 120, 27, 30)
  <\/script>
</body>`

const scoreHtml = '<body style="margin:0;color:#eee;font-family:Arial"><h3>Best: 00000</h3></body>'

const rich = new MB.AIRich(sock)
  .addSection(MB.htmlSection('<b>Dino Runner</b> — tap to play'))

rich.addEmbeddedScreen(MB.embeddedScreen({
  title: 'Preview',
  tabs: [
    MB.embeddedTab({ id: 'tab_0', tabHeader: 'Dino Runner', sections: [MB.htmlSection(gameHtml)] }),
    MB.embeddedTab({ id: 'tab_1', tabHeader: 'Score', sections: [MB.htmlSection(scoreHtml)] })
  ]
}))

await rich.send(m.chat)
```

```js
rich.addEmbeddedScreen(MB.embeddedScreen({
  title: 'Details',
  content: [MB.htmlSection(detailHtml)]
}))
```

What is actually sent on the wire:

```jsonc
{
  "response_id": "183d0aee-fb35-4349-8bc5-7793b11859db",
  "sections": [
    {
      "__typename": "GenAIUnifiedResponseSection",
      "view_model": {
        "__typename": "GenAISingleLayoutViewModel",
        "primitive": {
          "__typename": "GenAIaeacdsnwHtmlPrimitive",
          "payload": "<b>Dino Runner</b> — tap to play",
          "trusted_sources": []
        }
      }
    }
  ],
  "embedded_screens": [
    {
      "id": "0f2c…",
      "title": "Preview",
      "content": [
        {
          "__typename": "FOAEmbeddedScreenContentTabbed",
          "tabs": [
            {
              "id": "tab_0",
              "tab_header": "Dino Runner",
              "sections": [
                {
                  "__typename": "GenAIUnifiedResponseSection",
                  "view_model": {
                    "__typename": "GenAISingleLayoutViewModel",
                    "primitive": { "__typename": "GenAIaeacdsnwHtmlPrimitive", "payload": "<body…>" }
                  }
                }
              ]
            },
            { "id": "tab_1", "tab_header": "Score", "sections": [ /* … */ ] }
          ]
        }
      ]
    }
  ]
}
```

The same thing without a builder:

```js
import { MB } from 'zahan-baileys'

await sock.relayMessage(m.chat, {
  messageContextInfo: {
    deviceListMetadata: {},
    deviceListMetadataVersion: 2,
    botMetadata: {
      messageDisclaimerText: '',
      botResponseId: 'f090cd0f-bad1-4a4a-b0c3-b8f8e852c197',
      verificationMetadata: MB.generateVerificationMetadata()
    }
  },
  botForwardedMessage: {
    message: {
      richResponseMessage: {
        messageType: 1,
        submessages: [{ messageType: 2, messageText: '> Dino Runner' }],
        unifiedResponse: {
          data: Buffer.from(JSON.stringify({
            response_id: '183d0aee-fb35-4349-8bc5-7793b11859db',
            sections: [
              {
                __typename: 'GenAIUnifiedResponseSection',
                view_model: {
                  __typename: 'GenAISingleLayoutViewModel',
                  primitive: { __typename: 'GenAIMarkdownTextUXPrimitive', text: '> Dino Runner' }
                }
              }
            ],
            embedded_screens: [
              {
                title: 'Preview',
                content: [
                  {
                    __typename: 'FOAEmbeddedScreenContentTabbed',
                    tabs: [
                      {
                        id: 'tab_0',
                        tab_header: 'Dino Runner',
                        sections: [
                          {
                            __typename: 'GenAIUnifiedResponseSection',
                            view_model: {
                              __typename: 'GenAISingleLayoutViewModel',
                              primitive: {
                                __typename: 'GenAIaeacdsnwHtmlPrimitive',
                                payload: gameHtml,
                                trusted_sources: ['nixel.dev']
                              }
                            }
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          })).toString('base64')
        },
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
          forwardOrigin: 4
        }
      }
    }
  }
}, {})
```

The typenames involved:

```js
import { MB } from 'zahan-baileys'

MB.embeddedScreen({ typename: MB.EMBEDDED_SCREEN_TYPENAME, tabs: [tab] })
MB.embeddedTab({ typename: MB.EMBEDDED_SCREEN_TAB_TYPENAME, sections: [...] })

// for builds that expect a different container name
MB.embeddedScreen({ tabs: [tab], tabsTypename: 'FOAIDButtonSheets' })
```

Reading an embedded screen back:

```js
import { MB } from 'zahan-baileys'

const info = MB.decodeAIRich(m.message)

info.embeddedScreens   // the raw screens, exactly as received
info.embeddedTabs      // all tabs, flattened, from either nesting shape
info.embeddedSections  // all sections inside those screens

// or per screen
MB.readEmbeddedTabs(info.embeddedScreens[0])
MB.readEmbeddedSections(info.embeddedScreens[0])

// get the HTML carried by a tab
const html = MB.readEmbeddedSections(info.embeddedScreens[0])
  .map(section => section.view_model?.primitive?.payload)
  .filter(Boolean)
```

---

## 🖼️ Album Messages

Send several images and videos as one album message:

```js
await sock.sendMessage(jid, {
  album: [
    {
      image: { url: 'https://example.com/1.jpg' },
      caption: 'Image 1'
    },
    {
      image: { url: 'https://example.com/2.jpg' },
      caption: 'Image 2'
    },
    {
      video: { url: 'https://example.com/3.mp4' },
      caption: 'Video 3'
    }
  ],
  caption: 'Caption for the whole album'
})
```

---

## 🎞️ Paired Photo + Video (imgvid)

```js
await sock.sendMessage(jid, {
  image: { url: 'https://example.com/media.jpeg' },
  video: { url: 'https://example.com/media.mp4' },
  caption: 'Photo you can play'
})
```

---

## 📸 Status

Status messages go to `status@broadcast`:

```js
await sock.sendMessage('status@broadcast', {
  text: 'Hello everyone'
}, {
  statusJidList: ['628xxxx@s.whatsapp.net', '628yyyy@s.whatsapp.net']
})
```

### Background, Text Colour, and Font

```js
import { StatusFont } from 'zahan-baileys'

await sock.sendMessage('status@broadcast', { text: 'Hello everyone' }, {
  statusJidList,
  backgroundColor: '#7C3AED',
  textColor: '#FFFFFF',
  font: StatusFont.CALISTOGA_REGULAR
})
```

Available fonts:

```js
import { StatusFont } from 'zahan-baileys'

await sock.sendMessage('status@broadcast', {
  text: 'ANNOUNCEMENT'
}, { statusJidList, backgroundColor: '#7C3AED', textColor: '#FFFFFF', font: StatusFont.EXO2_EXTRABOLD })
```

### Image, Video, and Voice Status

```js
await sock.sendMessage('status@broadcast', {
  image: { url: './foto.jpg' },
  caption: 'Hello everyone'
}, { statusJidList })

await sock.sendMessage('status@broadcast', {
  video: { url: './clip.mp4' },
  caption: 'Hello everyone'
}, { statusJidList })
```

```js
await sock.sendMessage('status@broadcast', {
  audio: { url: './sound.ogg' },
  mimetype: 'audio/ogg; codecs=opus',
  ptt: true
}, {
  statusJidList,
  backgroundColor: '#7C3AED'
})
```

### Status Stickers

```js
import {
  locationSticker,
  channelSticker,
  linkSticker,
  musicSticker,
  StatusLinkType
} from 'zahan-baileys'

await sock.sendMessage('status@broadcast', {
  image: { url: './holiday.jpg' },
  caption: 'Weekend',
  statusStickers: [
    locationSticker({
      latitude: -6.2088,
      longitude: 106.8456,
      name: 'Colombo',
      area: { x: 0.1, y: 0.72, width: 0.5, height: 0.1 }
    }),
    linkSticker({
      url: 'https://example.com/blog',
      title: 'Read the story',
      linkType: StatusLinkType.RASTERIZED_LINK_FULL_URL,
      area: { x: 0.1, y: 0.06, width: 0.8, height: 0.09 }
    })
  ]
})
```

```js
import { readStickers } from 'zahan-baileys'

for (const sticker of readStickers(msg.message)) {
  if (sticker.kind === 'location') console.log(sticker.location.degreesLatitude)
  if (sticker.kind === 'music') console.log(sticker.music.title)
}
```

### Sending a Song

```js
await sock.sendMessage(jid, {
  song: {
    audio: { url: './song.mp3' },
    artwork: { url: './cover.jpg' },
    title: 'Song Title',
    author: 'Singer',
    url: 'https://example.com/track'
  }
})
```

```js
await sock.sendMessage(jid, {
  song: {
    audio: { url: './message.opus' },
    mimetype: 'audio/ogg; codecs=opus',
    ptt: true,
    artwork: { url: './cover.jpg' },
    title: 'Title'
  }
})
```

> Music statuses only accept audio hosted on Meta's own CDN; other hosts are rejected locally.

### Group Status

```js
await sock.sendMessage(groupJid, {
  text: 'hello group',
  groupStatus: true
})
```

```js
import { StatusFont } from 'zahan-baileys'

await sock.sendMessage(groupJid, {
  text: 'hello group',
  groupStatus: true,
  statusAudience: { listName: 'Besties', listEmoji: '💜' }
}, {
  backgroundColor: '#7C3AED',
  textColor: '#FFEE58',
  font: StatusFont.EXO2_EXTRABOLD
})
```

```jsonc
{
  "groupStatusMessageV2": {
    "message": {
      "extendedTextMessage": {
        "text": "hello group",
        "backgroundArgb": 4286331629,
        "textArgb": 4294962776,
        "font": 9,
        "contextInfo": {
          "statusAudienceMetadata": { "audienceType": 1, "listName": "Besties", "listEmoji": "💜" },
          "isGroupStatus": true
        }
      }
    }
  }
}
```

Fonts available for group status:

```
SYSTEM                 value= 0 | font=0  | bg=0xff7c3aed | isGroupStatus=true
SYSTEM_TEXT            value= 1 | font=1  | bg=0xff7c3aed | isGroupStatus=true
FB_SCRIPT              value= 2 | font=2  | bg=0xff7c3aed | isGroupStatus=true
SYSTEM_BOLD            value= 6 | font=6  | bg=0xff7c3aed | isGroupStatus=true
MORNINGBREEZE_REGULAR  value= 7 | font=7  | bg=0xff7c3aed | isGroupStatus=true
CALISTOGA_REGULAR      value= 8 | font=8  | bg=0xff7c3aed | isGroupStatus=true
EXO2_EXTRABOLD         value= 9 | font=9  | bg=0xff7c3aed | isGroupStatus=true
COURIERPRIME_BOLD      value=10 | font=10 | bg=0xff7c3aed | isGroupStatus=true
```

```js
await sock.sendMessage(groupJid, {
  audio: { url: './sound.ogg' },
  mimetype: 'audio/ogg; codecs=opus',
  ptt: true,
  groupStatus: true
}, { backgroundColor: '#7C3AED' })
```

Only a subset of status fields can actually be styled — the client ignores the rest.

---

## 📢 Newsletter / Channels

> A channel message address is a `server_id`, not the `key.id` used in chats. Read it from an incoming channel message.

### Creating a Channel

```js
const newsletter = await sock.newsletterCreate(
  'Zahan Updates',
  'Official channel update'
)

console.log(newsletter)
```

### Changing the Name

```js
await sock.newsletterUpdateName(
  '123456789@newsletter',
  'Zahan News'
)
```

### Changing the Description

```js
await sock.newsletterUpdateDescription(
  '123456789@newsletter',
  'Latest news from Zahan'
)
```

### Changing the Picture

```js
await sock.newsletterUpdatePicture(
  '123456789@newsletter',
  { url: 'https://example.com/channel.jpg' }
)
```

### Reaction Settings

```js
await sock.newsletterUpdateReactions('123456789@newsletter', 'BASIC')
```

### Follow / Unfollow

```js
await sock.newsletterFollow('123456789@newsletter')
await sock.newsletterUnfollow('123456789@newsletter')
```

### Mute / Unmute

```js
await sock.newsletterMute('123456789@newsletter')
await sock.newsletterUnmute('123456789@newsletter')
```

### Muting Admin or Follower Activity

```js
await sock.newsletterUpdateUserSetting('123456789@newsletter', 'ADMIN_NOTIFICATIONS', true)
await sock.newsletterUpdateUserSetting('123456789@newsletter', 'FOLLOWER_NOTIFICATIONS', false)
```

### Listing Followed Channels

```js
const newsletters = await sock.newsletterSubscribed()

const lengkap = await sock.newsletterSubscribed({
  fetchStatusMetadata: true,
  fetchWamoSub: true
})
```

### Reading Channel Metadata

```js
const metadata = await sock.newsletterMetadata(
  'jid',
  '123456789@newsletter'
)

console.log(metadata.thread_metadata.handle)          // the channel's @username
console.log(metadata.thread_metadata.subscribers_count)
console.log(metadata.thread_metadata.settings.reaction_codes.value)
```

```js
const metadata = await sock.newsletterMetadata('jid', '123456789@newsletter', {
  fetchPinnedMessages: true,
  fetchStatusMetadata: true,
  fetchWamoSub: true
})

metadata.thread_metadata.pinned_messages   // [ { message_id, expiry_ts } ]
metadata.thread_metadata.wamo_sub          // { plan_id }
metadata.status_metadata                   // { last_status_server_id, last_status_sent_time }
```

### Incremental Message Updates

```js
const { messages } = await sock.newsletterFetchMessageUpdates('123456789@newsletter', {
  count: 50,
  since: 1770000000
})
```

### Followers

```js
const followers = await sock.newsletterFollowers('123456789@newsletter', { count: 100 })
```

### Insights

```js
const insights = await sock.newsletterInsights('123456789@newsletter', {
  metrics: ['NET_FOLLOWS', 'UNFOLLOWS']
})
// { result: [{ id, values }], last_update_time, metrics_status }
```

### Your Own Reactions and Votes

```js
const groups = await sock.newsletterMyAddOns({ limit: 100 })
const oneChannel = await sock.newsletterMyAddOns({ limit: 50, jid: '123456789@newsletter' })
const onStatuses = await sock.newsletterStatusMyAddOns({ limit: 50 })

for (const group of groups) {
  for (const m of group.messages) {
    console.log(group.jid, m.serverId, m.reaction?.code, m.pollVote?.hashes)
  }
}
```

### Reacting to a Channel Message

```js
await sock.newsletterReactMessage(
  '123456789@newsletter',
  '175',
  '🔥'
)
```

```js
await sock.newsletterReactMessage(
  '123456789@newsletter',
  '175',
  ''
)
```

### Pin / Unpin Messages

```js
await sock.newsletterPinMessages('123456789@newsletter', [175])
await sock.newsletterUnpinMessages('123456789@newsletter', 175)
```

### Content Labels

```js
await sock.newsletterLabelAiContent('123456789@newsletter', 175)
await sock.newsletterLabelPaidPartnership('123456789@newsletter', 175)
```

### Voting in a Channel Poll

```js
await sock.newsletterSendPollVote('123456789@newsletter', pollServerId, ['Colombo'])
```

### Poll Voters

```js
const voters = await sock.newsletterPollVoters('123456789@newsletter', 175, {
  limit: 100,
  voteHash: undefined
})
```

### Reaction Senders

```js
const senders = await sock.newsletterReactionSenders('123456789@newsletter', 175)
```

### Posting Channel Status

```js
await sock.sendNewsletterStatus('123456789@newsletter', {
  image: { url: './poster.jpg' },
  caption: 'New release today'
})

await sock.sendNewsletterStatus('123456789@newsletter', {
  text: 'Thanks for 10 thousand followers'
})
```

```js
await sock.sendNewsletterStatusReaction('123456789@newsletter', 175, '🔥')
await sock.sendNewsletterStatusReaction('123456789@newsletter', 175, undefined)
```

```js
await sock.revokeNewsletterStatus('123456789@newsletter', statusId)
```

Where the server id comes from:

```js
const posted = await sock.sendNewsletterStatus('123456789@newsletter', {
  image: { url: 'https://example.com/drop.jpg' },
  caption: 'New release today'
})

posted.newsletterStatusServerId   // 175 — from the echo, not from the ack
posted.newsletterStatusAck        // its own ack, which never carries that id
posted.newsletterStatusDelivered  // the raw <status> node the id came from

await sock.sendNewsletterStatusReaction('123456789@newsletter', posted.newsletterStatusServerId, '🔥')
```

Check whether a channel may post before trying:

```js
const { canPost, canPostMusic, capabilities } = await sock.newsletterCanPostStatus('123456789@newsletter')
```

> Posting requires the `channel_status_creation` feature, admin or owner rights, and `CHANNEL_STATUS_PRODUCER` in the channel capabilities. Check `newsletterAdminCapabilities` first — without it the server acknowledges and discards the status.

### Status Questions

```js
await sock.sendNewsletterStatus('123456789@newsletter', {
  image: { url: './bg.jpg' },
  question: { text: 'Ask me anything' }
})
```

### Reading Channel Status

```js
const list = await sock.getNewsletterStatuses('123456789@newsletter', { count: 20 })

for (const status of list.statuses) {
  console.log(status.serverId, status.type, status.viewsCount, status.responsesCount)
  console.log(status.adminProfile?.name)
  console.log(status.reactionCounts) // [ { code: '👍', count: 12 } ]
}
```

```js
const updates = await sock.getNewsletterStatusUpdates('123456789@newsletter', {
  count: 20,
  since: 1770000000
})
```

### Channel Status Attribution

```js
await sock.sendMessage('status@broadcast', {
  image: { url: 'https://example.com/status.jpg' },
  caption: 'Shared from Zahan Updates',
  newsletterStatus: {
    newsletterJid: '123456789@newsletter',
    messageId: 42,
    duration: 24,
    hasMultipleReshares: false
  }
}, {
  statusJidList: audienceJids
})
```

```js
const attribution = makeNewsletterStatusAttribution({
  newsletterJid: '123456789@newsletter',
  messageId: 42
})

await sock.sendMessage('status@broadcast', {
  text: 'Channel status',
  contextInfo: {
    statusAttributions: [attribution]
  }
}, {
  statusJidList: audienceJids
})
```

### Who Sent a Channel Message

```js
sock.ev.on('messages.upsert', ({ messages }) => {
  for (const msg of messages) {
    if (!msg.newsletterMeta) continue
    console.log(msg.newsletterMeta.adminProfile.name)               // 'Sahan Hayanasi'
    console.log(msg.newsletterMeta.adminProfile.pictureDirectPath)
    console.log(msg.newsletterMeta.paidPartnership)                 // sponsored post
    console.log(msg.newsletterMeta.aiContent)                       // self-declared AI content
    console.log(msg.newsletterMeta.editTimestamp)
  }
})
```

### Question Answers

```js
const { responses } = await sock.newsletterQuestionResponses('123456789@newsletter', 175, {
  count: 50,
  filter: 'starred',
  searchText: 'price'
})

for (const r of responses) {
  console.log(r.sender.notifyName, r.sender.lid)
  console.log(r.message?.conversation)
  console.log(r.starred, r.replied)
}
```

### Hiding Question Answers

```js
await sock.newsletterQuestionResponseState('123456789@newsletter', questionServerId, responseServerId, 'HIDDEN')
await sock.newsletterQuestionResponseState('123456789@newsletter', questionServerId, responseServerId, 'VISIBLE')
```

### Admin Capabilities

```js
const capabilities = await sock.newsletterAdminCapabilities('123456789@newsletter')
console.log(capabilities)
// [ 'INSIGHTS', 'ADMIN_NOTIFICATIONS', 'PHOTO_POLLS', 'QUESTIONS', 'QUIZ', 'THREAD_MENU' ]
```

### Admin Profile

```js
const info = await sock.newsletterAdminInfo('123456789@newsletter')
// {
//   id: '123456789@newsletter',
//   adminCount: 3,
//   adminProfile: { id, name, picture: { id, directPath } },
//   adminProfilesEnabled: true
// }

const caps = await sock.newsletterAdminCapabilities('123456789@newsletter')
caps.includes('ADMIN_PROFILE')   // whether WhatsApp has enabled this feature for the channel
```

```js
sock.ev.on('newsletter-admin-profile.update', ({ id, adminProfile }) => {
  console.log(id, adminProfile)
  // { id, name, pictureId, pictureDirectPath } — or null if an admin removed theirs
})
```

### Admin Invitations

```js
await sock.newsletterCreateAdminInvite('123456789@newsletter', '6281234567890@s.whatsapp.net')
await sock.newsletterRevokeAdminInvite('123456789@newsletter', '6281234567890@s.whatsapp.net')
await sock.newsletterAcceptAdminInvite('123456789@newsletter')
```

### Pending Admin Invitations

```js
const pending = await sock.newsletterPendingAdminInvites('123456789@newsletter')
// [ { id: '628xxxxxxxxx@s.whatsapp.net', phoneNumber: '628xxxxxxxxx' } ]
```

### Discovery

```js
const recommended = await sock.newsletterRecommended({ limit: 20, countryCodes: ['ID'] })
const similar = await sock.newsletterSimilar('123456789@newsletter', { limit: 20 })
```

### Directory

```js
const list = await sock.newsletterDirectoryList({
  view: 'RECOMMENDED',        // RECOMMENDED | NEW | POPULAR | FEATURED | TRENDING
  categories: ['NEWS'],
  countryCodes: ['ID'],
  limit: 20
})

const found = await sock.newsletterDirectorySearch('zahan', { limit: 20 })
const preview = await sock.newsletterDirectoryCategories({ categories: ['NEWS'], countryCode: 'ID' })
```

### Enforcement and Appeals

```js
const enf = await sock.newsletterEnforcements('123456789@newsletter')

console.log(enf.suspensions)
console.log(enf.adminProfiles)            // enforcement targeting the admin profile feature
console.log(enf.profilePictureDeletions)
console.log(enf.violatingMessages)
console.log(enf.geoSuspensions)
```

```js
{
  enforcementId: '...',
  createdAt: 1770000000,
  violationCategory: 'GENERIC_VIOLATION',
  source: '...',
  appealState: '...',
  appealCreatedAt: undefined,
  appealReasonOptions: [ { reason: 'RM_COPS', label: 'I own the rights' } ],
  appealFormUrl: 'https://...',
  policy: { headline, subtitle, overview, explanation, adminDisclaimer }
}
```

```js
const reports = await sock.newsletterReports()
await sock.newsletterAppealReport(reports[0].report_id, 'RESPONSE_VIOLATES_GUIDELINES')
```

---

## 🪪 Username and Info

### Username

```js
const current = await sock.getUsername()
console.log(current) // { username: 'zahan', state: 'ACTIVE', pin: '1234' }

await sock.setUsername('zahan')
await sock.setUsernamePin('1234')
await sock.removeUsernamePin()
await sock.removeUsername()
```

```js
const { available, suggestions } = await sock.checkUsernameAvailability('zahan')
```

Username rules:

```js
import { validateUsername, isUsernamePin, displayUsername } from 'zahan-baileys'

validateUsername('zahan.user')  // { isValid: true }
validateUsername('sahan.com')       // { isValid: false, errorType: 'INVALID_DOMAIN_SUFFIX' }
isUsernamePin('1234')              // true
displayUsername('sahan')            // '@sahan'
```

### Info / Text Status

```js
await sock.updateTextStatus('Building a bot', { emoji: '🤖', ephemeralDurationSec: 0 })

const mine = await sock.fetchTextStatus(['6281234567890@s.whatsapp.net'])
const about = await sock.fetchAbout('6281234567890@s.whatsapp.net')
console.log(about.status)
```

### Terms of Service Notifications

```js
const notices = await sock.fetchUserNotices()
// [ { id: '20601216', stage: '2', t: '...', version: '...', type: '...' } ]

await sock.updateUserNoticeStage('20601216', 5)
```

### Marketing Opt-Out List

```js
const list = await sock.fetchOptOutList({ category: 'marketing' })

await sock.updateOptOut({
  jid: '6281234567890@s.whatsapp.net',
  category: 'marketing',
  action: 'add',
  reason: 'user_request'
})
```

### Push Settings

```js
const settings = await sock.fetchPushSettings()
```

### Server-Side Link Preview

```js
const preview = await sock.fetchServerLinkPreview('https://example.com')
// { direct_path, hash, title, description, preview_type, thumb_data, width, height }
```

---

## 👥 Group Management

### Creating a Group

```js
const group = await sock.groupCreate(
  'Zahan Community',
  [
    '6281234567890@s.whatsapp.net',
    '6289876543210@s.whatsapp.net'
  ]
)

console.log(group.id)
```

### Adding Members

```js
await sock.groupParticipantsUpdate(
  groupJid,
  ['6281234567890@s.whatsapp.net'],
  'add'
)
```

### Removing Members

```js
await sock.groupParticipantsUpdate(
  groupJid,
  ['6281234567890@s.whatsapp.net'],
  'remove'
)
```

### Promote / Demote

```js
await sock.groupParticipantsUpdate(groupJid, [userJid], 'promote')
await sock.groupParticipantsUpdate(groupJid, [userJid], 'demote')
```

### Changing the Group Description

```js
await sock.groupUpdateDescription(
  groupJid,
  'Welcome to Zahan Community 💜'
)
```

### Subject and Settings

```js
await sock.groupUpdateSubject(groupJid, 'New name')
await sock.groupSettingUpdate(groupJid, 'announcement')
```

### Who May Join and Who May Add

```js
await sock.groupMemberAddMode(groupJid, 'admin_add')
await sock.groupJoinApprovalMode(groupJid, 'on')
```

### Group History Toggle

```js
import { GroupHistoryToggleMode } from 'zahan-baileys'
// GroupHistoryToggleMode = { DEFAULT: 0, ON: 1, OFF: 2 }

sock.ev.on('groups.update', ([update]) => {
  if (update.groupHistoryToggleMode !== undefined) {
    console.log(update.id, GroupHistoryToggleMode[update.groupHistoryToggleMode])
  }
})
```

### Membership Request Queue

```js
const pending = await sock.groupRequestParticipantsList(groupJid)
await sock.groupRequestParticipantsUpdate(groupJid, [userJid], 'approve')
await sock.groupRequestParticipantsUpdate(groupJid, [userJid], 'reject')
```

### Invite Links

```js
const code = await sock.groupInviteCode(groupJid)
console.log('https://chat.whatsapp.com/' + code)

const fresh = await sock.groupRevokeInvite(groupJid)

const preview = await sock.groupGetInviteInfo(code)
await sock.groupAcceptInvite(code)
```

### Disappearing Messages

```js
await sock.groupToggleEphemeral(groupJid, 7 * 24 * 60 * 60)
await sock.groupToggleEphemeral(groupJid, 0)
```

### Reading Groups

```js
const metadata = await sock.groupMetadata(groupJid)
const all = await sock.groupFetchAllParticipating()

await sock.groupLeave(groupJid)
```

---

## 🏘️ Communities

### Creating and Linking

```js
const community = await sock.communityCreate('Zahan Community', 'What this community is for')

const group = await sock.communityCreateGroup('Announcement', [userJid], community.id)

await sock.communityLinkGroup(existingGroupJid, community.id)
await sock.communityUnlinkGroup(existingGroupJid, community.id)

const linked = await sock.communityFetchLinkedGroups(community.id)
```

### Members and Settings

```js
await sock.communityParticipantsUpdate(communityJid, [userJid], 'promote')
await sock.communityUpdateSubject(communityJid, 'New name')
await sock.communityUpdateDescription(communityJid, 'New description')
await sock.communitySettingUpdate(communityJid, 'announcement')
await sock.communityMemberAddMode(communityJid, 'admin_add')
await sock.communityJoinApprovalMode(communityJid, 'on')
await sock.communityToggleEphemeral(communityJid, 7 * 24 * 60 * 60)
```

### Invites and Reading

```js
const code = await sock.communityInviteCode(communityJid)
await sock.communityRevokeInvite(communityJid)
await sock.communityAcceptInvite(code)
const preview = await sock.communityGetInviteInfo(code)

const metadata = await sock.communityMetadata(communityJid)
const all = await sock.communityFetchAllParticipating()
await sock.communityLeave(communityJid)
```

---

## 🔒 Privacy Settings

```js
const settings = await sock.fetchPrivacySettings(true)
```

```js
await sock.updateLastSeenPrivacy('contacts')
await sock.updateOnlinePrivacy('match_last_seen')
await sock.updateDisableLinkPreviewsPrivacy(true)
```

### Default Disappearing Messages

```js
await sock.updateDefaultDisappearingMode(7 * 24 * 60 * 60)
const durations = await sock.fetchDisappearingDuration(jidA, jidB)
```

### Blocking

```js
await sock.updateBlockStatus(jid, 'block')
await sock.updateBlockStatus(jid, 'unblock')
const blocked = await sock.fetchBlocklist()
```

### Reporting Spam

```js
import { SPAM_FLOWS } from 'zahan-baileys'

const report = await sock.reportSpam(jid)
// { jid: '628xxxx@s.whatsapp.net', flow: 'overflow_menu_report', reported: true, node }

await sock.reportSpam(groupJid, {
    flow: SPAM_FLOWS.GroupInfoReport,
    source: senderJid
})
```

---

## 📨 All Message Types

### Why `conversation` Is Sometimes Empty

A message body lives in different fields depending on its type. Always normalise first:

```js
const m = messages[0]
console.log(m.message.conversation)          // undefined
console.log(Object.keys(m.message))          // [ 'groupStatusMessageV2' ]
```

```js
import { normalizeMessageContent, getContentType } from 'zahan-baileys'

const content = normalizeMessageContent(m.message)
const type = getContentType(content)        // 'imageMessage'
const text = content?.conversation || content?.extendedTextMessage?.text
```

The remaining message types are handled the same way: unwrap `viewOnceMessage`, `ephemeralMessage`, `documentWithCaptionMessage`, `editedMessage`, and `viewOnceMessageV2Extension` before reading the content. `getContentType(msg)` returns the name of the populated field.

### Reading Rich Messages

`readRichMessage(msg)` returns a normalised description of interactive, AIRich, and Bloks content, or `null` for a plain message.

---

## 👀 Presence and Read Receipts

```js
await sock.presenceSubscribe(jid)

await sock.sendPresenceUpdate('composing', jid)
await sock.sendPresenceUpdate('recording', jid)
await sock.sendPresenceUpdate('paused', jid)

await sock.sendPresenceUpdate('available')
await sock.sendPresenceUpdate('unavailable')
```

### Marking as Read

```js
await sock.readMessages([msg.key])

await sock.sendReceipt(jid, participant, [messageId], 'read')
await sock.sendReceipts([msg.key], 'read')
```

### Checking Numbers

```js
const results = await sock.onWhatsApp('6281234567890', '6289876543210')
for (const entry of results) {
  console.log(entry.jid, entry.exists)
}
```

Looking up a JID by username:

```js
const found = await sock.onWhatsAppUsername('@zahan', 'alternate')
for (const entry of found) {
  console.log(entry.jid, entry.exists)
}

const withPin = await sock.onWhatsAppUsername({ username: 'zahan', pin: '1234' })
```

```js
const names = await sock.getUsernames('628123@s.whatsapp.net', '234256710246613@lid')
for (const entry of names) {
  console.log(entry.jid, entry.username)
}
```

---

## 🗂️ Chat State

`chatModify` handles pin, archive, mute, star, mark-as-unread, delete, and clear:

```js
await sock.chatModify({ archive: true, lastMessages: [msg] }, jid)
await sock.chatModify({ pin: true }, jid)
await sock.chatModify({ mute: 8 * 60 * 60 * 1000 }, jid)
await sock.chatModify({ mute: null }, jid)
await sock.chatModify({ markRead: false, lastMessages: [msg] }, jid)
await sock.chatModify({ star: { messages: [{ id: msg.key.id, fromMe: msg.key.fromMe }], star: true } }, jid)
await sock.chatModify({ clear: true, lastMessages: [msg] }, jid)
await sock.chatModify({ delete: true, lastMessages: [msg] }, jid)
await sock.chatModify({ contact: { fullName: 'Zahan' } }, jid)
```

### History and Resync

```js
await sock.fetchMessageHistory(50, oldestMsgKey, oldestMsgTimestamp)
await sock.requestPlaceholderResend(messageKey)
await sock.resyncAppState(['regular_high'], false)
```

---

## 🏷️ Labels

```js
await sock.addLabel(jid, { id: '1', name: 'Customer', color: 0, deleted: false })

await sock.addChatLabel(jid, labelId)
await sock.removeChatLabel(jid, labelId)

await sock.addMessageLabel(jid, messageId, labelId)
await sock.removeMessageLabel(jid, messageId, labelId)
```

---

## 🛍️ Business and Catalog

```js
const profile = await sock.getBusinessProfile(jid)
await sock.updateBusinessProfile({ description: 'Zahan Shop', address: 'Colombo', email: 'hello@example.com' })

const catalog = await sock.getCatalog({ jid, limit: 10 })
const collections = await sock.getCollections(jid, 51)
const order = await sock.getOrderDetails(orderId, tokenBase64)
```

### Managing Products

```js
const created = await sock.productCreate({
  name: 'Zahan Sticker Pack',
  description: 'A pack of stickers',
  price: 15000,
  currency: 'IDR',
  isHidden: false,
  images: [{ url: 'https://example.com/product.jpg' }]
})

await sock.productUpdate(created.id, { price: 20000 })
await sock.productDelete([created.id])
```

### Profile and Quick Replies

```js
await sock.updateProfileName('Zahan')
await sock.updateCoverPhoto(buffer)
await sock.addOrEditQuickReply({ shortcut: 'hi', message: 'Hello!', keywords: ['hello'] })

await sock.addOrEditContact(jid, { fullName: 'Zahan' })
await sock.removeContact(jid)
```

### Re-fetching Expired Media

```js
const refreshed = await sock.updateMediaMessage(msg)
```

### Group Member Labels

```js
await sock.updateMemberLabel(groupJid, 'Treasurer')
// { jid: '12345-67890@g.us', label: 'Treasurer', messageId: '3EB0...' }

await sock.removeMemberLabel(groupJid)
```

```js
sock.ev.on('group.member-tag.update', ({ groupId, participant, label }) => {
  console.log(participant, 'in', groupId, 'is now', label)
})
```

---

## 📞 Calls

```js
import { CALL_AUDIO_PREFIX, CALL_VIDEO_PREFIX } from 'zahan-baileys'

const token = await sock.createCallLink('video')
console.log(CALL_VIDEO_PREFIX + token)

const scheduled = await sock.createCallLink('audio', { startTime: Math.floor(Date.now() / 1000) + 3600 })
console.log(CALL_AUDIO_PREFIX + scheduled)

await sock.rejectCall(callId, callFrom)
```

### Placing a Voice Call

```js
import { makeVoipClient } from 'zahan-baileys'

sock.ev.on('connection.update', async ({ connection }) => {
    if (connection !== 'open') {
        return
    }

    const voip = await makeVoipClient(sock)
    const call = await voip.call('628123456789', {
        durationMs: 60000,
        audioSource: './hello.mp3'
    })

    call.on('ringing', () => console.log('ringing'))
    call.on('connected', () => console.log('answered'))
    call.on('ended', reason => console.log('ends:', reason))

    await call.waitForEnd()
})
```

```js
const voip = await makeVoipClient(sock)

sock.ev.on('connection.update', async ({ connection }) => {
    if (connection === 'open') {
        await voip.attach(sock)
    }
})
```

### Playing an Audio Queue

```js
const call = await voip.call('628123456789', {
    playlist: ['one.mp3'],
    durationMs: 0
})
```

```js
const call = await voip.call('628123456789', {
    playlist: [await findTrack('first song')],
    idleGraceMs: 30000,
    durationMs: 0
})

call.on('track', track => console.log('memutar', track))
call.on('trackend', track => console.log('finished', track))

call.on('idle', async () => {
    const next = await findTrack(queue.shift())
    if (next) {
        call.enqueue(next)
    }
})

await call.waitForEnd()
```

### Video Calls

```js
const call = await voip.call('628123456789', {
    video: true,
    videoPlaylist: ['clip.mp4'],
    playlist: ['song.mp3'],
    durationMs: 0
})

call.on('videotrack', track => console.log('now showing', track))
```

```js
const call = await voip.callGroup('12345-67890@g.us', {
    video: true,
    videoPlaylist: ['clip.mp4']
})
```

```js
await voip.call('628123456789', { video: true, videoSource: './poster.jpg', playlist: ['song.mp3'] })
```

### Screen Sharing

```js
const call = await voip.call('628123456789', {
    screenShare: true,
    videoPlaylist: ['slide.png'],
    playlist: ['narration.mp3']
})
```

### Group Calls

```js
const call = await voip.callGroup('12345-67890@g.us', {
    playlist: ['one.mp3', 'two.mp3'],
    idleGraceMs: 30000,
    durationMs: 0
})
```

```js
const call = await voip.joinGroupCall({
    callId,
    callCreatorJid,
    groupJid,
    playlist: ['one.mp3']
})
```

### Logging Out

```js
await sock.logout()
```

---

## 📷 Profile Photos

### Reading a Profile Photo URL

```js
const url = await sock.profilePictureUrl(jid, 'image')
console.log(url)
```

### Changing a Profile Photo

```js
await sock.updateProfilePicture(jid, {
  url: 'https://example.com/profile.jpg'
})
```

### Removing a Profile Photo

```js
await sock.removeProfilePicture(jid)
```

---

## 🧰 Useful Exports

```js
import {
  makeWASocket,
  useMultiFileAuthState,
  useSingleFileAuthState,
  useSqliteAuthState,
  usePostgresAuthState,
  useMySQLAuthState,
  useMongoAuthState,
  useRedisAuthState,
  useNekoDBAuth,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  DisconnectReason,
  jidDecode,
  jidEncode,
  jidNormalizedUser,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  Button,
  ButtonV2,
  Carousel,
  AIRich,
  Toolkit,
  MessageBuilder,
  MB,
  MESSAGE_BUILDER_VERSION,
  TTLCache
} from 'zahan-baileys'
```

The builder version is exported as a constant:

```js
console.log(MESSAGE_BUILDER_VERSION)
console.log(MessageBuilder.VERSION)
```

### Internal Caches

```js
const userDevicesCache = config.userDevicesCache || new TTLCache({ stdTTL: 300 })
```

### When to Import `TTLCache`

```js
import makeWASocket, { TTLCache } from 'zahan-baileys'

const sock = makeWASocket({
  auth,
  userDevicesCache: new TTLCache({ stdTTL: 600, maxKeys: 50000 })
})
```

---

## 🔄 Updating the WhatsApp Web Version

The whole update chain is one command:

```bash
npm run wa:update
```

It reads the pinned revision, samples the live revision, downloads the bundle, parses the protobuf specs, compares snapshots, and runs a round-trip encoder over the fields. Reports are written to `.wa-bundle/report.md` and `.wa-bundle/report.json`.

Apply a safe bump:

```bash
npm run wa:update -- --apply
```

Supporting commands:

| Command | Purpose |
|---|---|
| `npm run wa:diff -- <old> <new>` | Diff two snapshots only |
| `npm run check:proto` | Check for protobuf gaps only |
| `npm run sync:proto` | Add missing protobuf fields to `WAProto` |
| `npm run verify:proto` | Round-trip encoder only |
| `npm run verify:mex` | Match each `w:mex` query against persisted bundle queries |
| `npm run fetch:bundle -- <dir>` | Download the raw bundle to a directory |
| `npm run audit:apk -- <dir>` | Compare `WAProto` with the classes in an Android APK |

```bash
npm run verify:mex
PROTO_BUNDLE_DIR=.wa-bundle/1047416414 npm run verify:mex
```

```
npm run audit:apk -- /path/to/extracted-apk
```

```
npm run audit:apk -- /path/to/extracted-apk /dev/null --json gaps.json
npm run sync:proto -- --gaps gaps.json
npm run verify:proto
```

Android-only fields are reported before they are added:

```
ANDROID ONLY Message.AlbumMessage.caption — safe to decode, send only when intentional
```

Keep generated snapshots out of Git:

```gitignore
node_modules/
npm-debug.log*
```

> **Rollout note.** `sw.js` and the chunk CDN can disagree while a release is being rolled out. The report distinguishes the advertised live revision from the revision actually analysed, and every conclusion — including `--apply` — uses the analysed one.

---

## ⏰ Scheduled Messages

```js
import {
  encodeScheduledMessage,
  decodeScheduledMessage,
  buildScheduledMsgMetaNode,
  buildUnscheduleProtocolMessage,
  isScheduledTimeValid,
  SCHEDULED_MSG_WINDOW
} from 'zahan-baileys'

const at = Math.floor(Date.now() / 1000) + 3600
if (!isScheduledTimeValid(at)) throw new Error('outside the allowed window')

const scheduled = encodeScheduledMessage({ conversation: 'sent later' })
// { revealKey, revealKeyId, encIv, encPayload, message: { conditionalRevealMessage } }

const meta = buildScheduledMsgMetaNode({
  scheduledTimestampS: at,
  revealKeyId: scheduled.revealKeyId,
  revealKey: scheduled.revealKey
})
// <meta type="scheduled_message" st="…"><key rkid="…">{32 byte}</key></meta>

await sock.relayMessage(jid, scheduled.message, {
  messageId: sock.generateMessageTag(),
  additionalNodes: [meta]
})
```

Decode a scheduled message when it arrives:

```js
const message = decodeScheduledMessage(msg.message, revealKey)
```

Unschedule or send it early:

```js
await sock.relayMessage(jid, buildUnscheduleProtocolMessage(scheduledKey), { messageId })
```

---

## 🧪 Modern WhatsApp Message APIs

These helpers cover the message shapes introduced in newer WhatsApp Web releases:

```js
import {
  makeNewsletterStatusAttribution,
  LOCATION_BROADCAST_JID,
  isJidLocationBroadcast
} from 'zahan-baileys'
```

### Message Key

```js
{
  remoteJid: 'status@broadcast',        // the chat it belongs to
  fromMe: false,                        // whether this account sent it
  id: '3EB03AC13066A48D44FF59',         // its message id
  participant: '628000@s.whatsapp.net'  // who sent it, in a group or in status
}
```

### Messages You Send

```js
const myStatus = await sock.sendMessage('status@broadcast', {
  image: { url: './foto.jpg' },
  caption: 'hello everyone'
}, { statusJidList })

console.log(myStatus.key)
// { remoteJid: 'status@broadcast', fromMe: true, id: '3EB03AC13066A48D44FF59' }
```

```js
const myGroupStatus = await sock.sendMessage(groupJid, { text: 'hello group', groupStatus: true })
// key: { remoteJid: '120363000000000000@g.us', fromMe: true, id: '…' }
```

### Messages You Receive

```js
sock.ev.on('messages.upsert', async ({ messages }) => {
  for (const m of messages) {
    if (m.key.remoteJid !== 'status@broadcast') continue

    console.log(m.key)
    // { remoteJid: 'status@broadcast', fromMe: false, id: '…', participant: '628000@s.whatsapp.net' }
  }
})
```

```js
const prompts = new Map()

sock.ev.on('messages.upsert', ({ messages }) => {
  for (const m of messages) {
    if (m.key.remoteJid === 'status@broadcast' && !m.key.fromMe) {
      prompts.set(m.key.id, m.key)
    }
  }
})

// …later
await sock.sendMessage('status@broadcast', {
  text: 'join in!',
  addYours: prompts.get(chosenId)
}, { statusJidList })
```

### Messages People Reply To

```js
const context = m.message?.extendedTextMessage?.contextInfo
const quotedKey = context && {
  remoteJid: m.key.remoteJid,
  fromMe: context.participant === sock.user.id,
  id: context.stanzaId,
  participant: context.participant
}
```

### Photo Polls

```js
await sock.sendMessage(jid, {
  poll: {
    name: 'Which cover?',
    values: [
      { name: 'Colombo', image: { url: './colombo.jpg' } },
      { name: 'Kandy', image: { url: './kandy.jpg' } }
    ],
    selectableCount: 1
  }
})
```

### Question Messages

```js
await sock.sendMessage(jid, {
  question: {
    text: 'Which feature should be added next?'
  }
})
```

```js
await sock.sendMessage('123456789@newsletter', {
  question: {
    text: 'Which update do you want next?'
  }
})
```

The question stanza:

```xml
<message to="123456789@newsletter" id="MESSAGE_ID" type="text">
  <meta questiontype="question"/>
  <plaintext>PROTO_MESSAGE</plaintext>
</message>
```

### Incoming Question Answers

```js
await sock.sendMessage(jid, {
  questionResponse: {
    key: questionMessage.key,
    text: 'MessageBuilder'
  }
})
```

### Question Replies

```js
await sock.sendMessage('123456789@newsletter', {
  questionReply: {
    text: 'Good choice, this is what we build next',
    serverQuestionId: 175,
    quotedQuestion: questionMessage.message,   // opsional
    quotedResponse: responseMessage.message    // opsional
  }
})
```

### Question Answers in Status

```js
await sock.sendMessage(jid, {
  statusQuestionAnswer: {
    key: statusQuestion.key,
    text: 'Zahan Baileys'
  }
})
```

### Status Quote Messages

```js
await sock.sendMessage(jid, {
  statusQuoted: {
    originalStatusId: statusMessage.key,
    type: 'QUESTION_ANSWER',
    text: 'Quoted status reply'
  }
})
```

### Status Sticker Interaction

```js
await sock.sendMessage(jid, {
  statusStickerInteraction: {
    key: statusMessage.key,
    stickerKey: 'heart',
    type: 'REACTION'
  }
})
```

### Status Notifications

```js
await sock.sendMessage(jid, {
  statusNotification: {
    responseMessageKey: responseMessage.key,
    originalMessageKey: statusMessage.key,
    type: 'STATUS_RESHARE'
  }
})
```

### Channel Admin Invitations

```js
await sock.sendMessage(userJid, {
  newsletterAdminInvite: {
    newsletterJid: '123456789@newsletter',
    newsletterName: 'Zahan Updates',
    caption: 'Join as an admin',
    inviteExpiration: Math.floor(Date.now() / 1000) + 86400
  }
})
```

### Channel Follower Invitations V2

```js
await sock.sendMessage(userJid, {
  newsletterFollowerInvite: {
    newsletterJid: '123456789@newsletter',
    newsletterName: 'Zahan Updates',
    caption: 'Follow this channel'
  }
})
```

### Custom Status Audience (Close Friends)

```js
await sock.sendMessage('status@broadcast', {
  text: 'Hello besties 💜',
  statusAudience: {
    listName: 'Besties',
    listEmoji: '💜'
  }
}, {
  statusJidList: bestiesJids
})
```

```js
await sock.sendMessage('status@broadcast', {
  image: { url: './foto.jpg' },
  caption: 'just for you',
  statusAudience: 'Besties'
}, { statusJidList: bestiesJids })
```

```js
await sock.sendMessage('status@broadcast', { text: 'hello', statusAudience: {} }, { statusJidList })
// → { audienceType: 1, listName: 'Close friends', listEmoji: '⭐' }
```

Group status audience:

```js
await sock.sendMessage(groupJid, {
  text: 'hello group',
  groupStatus: true
})
```

```js
await sock.sendMessage(groupJid, {
  text: 'hello group',
  groupStatus: true,
  statusAudience: { listName: 'Besties', listEmoji: '💜' }
})
```

```jsonc
{
  "groupStatusMessageV2": {
    "message": {
      "extendedTextMessage": {
        "text": "hello group",
        "contextInfo": {
          "statusAudienceMetadata": {
            "audienceType": 1,
            "listName": "Besties",
            "listEmoji": "💜"
          },
          "isGroupStatus": true
        }
      }
    }
  }
}
```

The fields:

```js
import { makeStatusAudienceMetadata, proto } from 'zahan-baileys'

makeStatusAudienceMetadata({ listName: 'Work', listEmoji: '💼', audienceType: 'CLOSE_FRIENDS' })
makeStatusAudienceMetadata({ listName: 'Work', audienceType: proto.ContextInfo.StatusAudienceMetadata.AudienceType.CLOSE_FRIENDS })
```

```js
await sock.sendMessage('status@broadcast', {
  text: 'Hello besties',
  contextInfo: {
    statusAudienceMetadata: makeStatusAudienceMetadata({ listName: 'Besties', listEmoji: '💜' })
  }
}, { statusJidList: bestiesJids })
```

Reading what you receive:

```js
import { normalizeMessageContent, getContentType } from 'zahan-baileys'

const content = normalizeMessageContent(m.message)
const audience = content?.[getContentType(content)]?.contextInfo?.statusAudienceMetadata

if (audience) {
  console.log(audience.listEmoji, audience.listName)   // 💜 Besties
}
```

Keeping the "Close friends" name:

```js
const sent = await sock.sendMessage('status@broadcast', {
  text: 'Hello besties',
  statusAudience: { listName: 'Besties', listEmoji: '💜' }
}, { statusJidList })

console.log(sent.message.extendedTextMessage.contextInfo.statusAudienceMetadata)
// StatusAudienceMetadata { audienceType: 1, listName: 'Besties', listEmoji: '💜' }
```

### Add Yours

```js
await sock.sendMessage('status@broadcast', {
  text: 'join in!',
  addYours: promptStatus.key
}, { statusJidList })
```

```jsonc
{
  "messageContextInfo": {
    "messageAssociation": {
      "associationType": 8,
      "parentMessageKey": { "remoteJid": "status@broadcast", "id": "ABC123", "participant": "628000@s.whatsapp.net" }
    }
  },
  "extendedTextMessage": { "text": "join in!" }
}
```

```js
await sock.sendMessage('status@broadcast', {
  image: { url: './answer.jpg' },
  caption: 'join in!',
  addYours: promptStatus.key
}, { statusJidList })
```

```js
await sock.sendMessage('status@broadcast', {
  text: 'join in!',
  addYours: { key: promptStatus.key, type: 'STATUS_ADD_YOURS_AI_IMAGINE' }
}, { statusJidList })
```

### Other Associations

```js
import { AssociationType } from 'zahan-baileys'

await sock.sendMessage('status@broadcast', {
  text: 'answer',
  messageAssociation: {
    type: AssociationType.STATUS_QUESTION,
    parentMessageKey: questionStatus.key,
    messageIndex: 0
  }
}, { statusJidList })
```

### Notifying the Original Poster

```js
await sock.sendMessage(promptAuthorJid, {
  statusNotification: {
    responseMessageKey: myStatus.key,
    originalMessageKey: promptStatus.key,
    type: 'STATUS_ADD_YOURS'
  }
})
```

### Mentions in Status

```js
await sock.sendMessage(
  ['628000@s.whatsapp.net', '120363000000000000@g.us'],
  { image: { url: './foto.jpg' }, caption: 'hello everyone' },
  { delayMs: 1500 }
)
```

```js
const myStatus = await sock.sendMessage('status@broadcast', { text: 'hello everyone' }, { statusJidList })

await sock.sendMessage(userJid, { statusMention: { key: myStatus.key } })
await sock.sendMessage(groupJid, { statusMention: { key: myStatus.key, group: true } })
```

```js
import { makeStatusMentionMessage } from 'zahan-baileys'

const content = makeStatusMentionMessage({ key: myStatus.key, group: false })
// { statusMentionMessage: { message: { protocolMessage: { key, type: 25 } } } }
```

### Group Status Reactions

```js
await sock.sendMessage(groupJid, {
  groupStatusReaction: {
    key: groupStatusMessage.key,
    text: '❤️'
  }
})
```

### Adding Poll Options

```js
await sock.sendMessage(jid, {
  pollAddOption: {
    pollCreationMessageKey: pollMessage.key,
    option: 'New option'
  }
})
```

### Comment Messages

```js
await sock.sendMessage(jid, {
  comment: {
    targetMessageKey: targetMessage.key,
    content: {
      text: 'Comment on this message'
    }
  }
})
```

### Event Invitation Messages

```js
await sock.sendMessage(jid, {
  eventInvite: {
    eventId: 'zahan-event-001',
    eventTitle: 'Zahan Community Event',
    startTime: new Date(Date.now() + 3600000),
    endTime: new Date(Date.now() + 7200000),
    caption: 'See you there'
  }
})
```

### Scheduled Calls

```js
const created = await sock.sendMessage(jid, {
  scheduledCall: {
    scheduledTimestampMs: new Date(Date.now() + 3600000),
    callType: 'VIDEO',
    title: 'Zahan Call'
  }
})
```

```js
await sock.sendMessage(jid, {
  scheduledCallEdit: {
    key: created.key,
    editType: 'CANCEL'
  }
})
```

### Live Location Broadcast Marker

```js
console.log(LOCATION_BROADCAST_JID)
console.log(isJidLocationBroadcast('location@broadcast'))
```

### Low-Level Builder

```js
import {
  makeQuestionMessage,
  makeQuestionResponseMessage,
  makeStatusQuestionAnswerMessage,
  makeStatusQuotedMessage,
  makeStatusStickerInteractionMessage,
  makeStatusNotificationMessage,
  makeNewsletterAdminInviteMessage,
  makeNewsletterFollowerInviteMessage,
  makePollAddOptionMessage,
  makeCommentMessage,
  makeEventInviteMessage,
  makeScheduledCallCreationMessage,
  makeScheduledCallEditMessage,
  makeGroupStatusReactionMessage,
  makeNewsletterStatusAttribution,
  makeGroupStatusAttribution,
  makeStatusAudienceMetadata
} from 'zahan-baileys'
```

---

## 🛡️ Account Health Signals

### New-Chat Message Quota

```js
const cap = await sock.fetchNewChatMessageCap()
```

### Reachout Timelock

```js
const lock = await sock.fetchAccountReachoutTimelock()
```

```js
sock.ev.on('connection.update', ({ reachoutTimeLock }) => {
  if (reachoutTimeLock?.isActive) stopSending()
})
```

### Using It as a Safety Guard

```js
const guard = async () => {
  const lock = await sock.fetchAccountReachoutTimelock()
  if (lock.isActive) return { send: false, reason: 'reachout timelock until ' + lock.timeEnforcementEnds }

  const cap = await sock.fetchNewChatMessageCap()
  if (cap.capped) return { send: false, reason: 'new-chat quota used up until ' + new Date(cap.cycleEnd * 1000) }
  if (cap.warned) return { send: false, reason: 'WhatsApp has already warned this account: ' + cap.status }
  if (cap.remaining !== undefined && cap.remaining < 10) return { send: false, reason: 'only ' + cap.remaining + ' left in this cycle' }

  return { send: true, remaining: cap.remaining }
}
```

---

## 🐞 Troubleshooting

### `Cannot read properties of undefined (reading 'undefined')` when replying

```
TypeError: Cannot read properties of undefined (reading 'undefined')
    at generateWAMessageFromContent (.../lib/Utils/messages.js:1443:64)
    at generateWAMessage (.../lib/Utils/messages.js:1507:12)
    at async Object.sendMessage (.../lib/Socket/messages-send.js:1300:33)
    at async Object.before (.../plugins/system/_firstchat.js:18:9)
```

The library logs a warning and sends without the quote:

```
WARN  nothing quotable here, sending without the quote
      jid: "120363000000000000@g.us"  quotedId: "3EB0…"  quotedContentType: undefined
```

Normalise the quoted message before building a reply:

```js
import { normalizeMessageContent, getContentType } from 'zahan-baileys'

const quotable = !!getContentType(normalizeMessageContent(m.message))
await sock.sendMessage(m.key.remoteJid, { text: 'hello' }, quotable ? { quoted: m } : {})
```

### The bot answers in every group except one

```
WARN  sender key did not reach every device, leaving them unmarked so the next send retries
      jid: "120363000000000000@g.us"
      skipped: [ "628000:12@s.whatsapp.net" ]
```

Reset that group's sender key distribution session:

```js
const reset = await sock.resetGroupSenderKey('120363000000000000@g.us')
console.log(reset)
// { jid: '120363000000000000@g.us', cleared: 4, devices: [ '628000:12@s.whatsapp.net', … ] }

await sock.sendMessage('120363000000000000@g.us', { text: 'hello' })
```

### The pairing code must be exactly 8 characters

```js
await sock.requestPairingCode(phone, 'ZAHAN01')
```

Use letters and digits only, with no separators.

### The pairing code appears but the phone never shows a prompt

Open WhatsApp → Linked Devices → Link with phone number and type the code manually. If the code is accepted, registration succeeded and only the push notification failed.

### The pairing request is rejected with 409

You have tried too often. Wait a few hours before trying again.

### `Socket is required`

Builders need a socket instance:

```js
const button = new MB.Button(sock)
```

### Buttons or AIRich render differently

Rendering is client-side and gated by feature flags. Use `Button`, `ButtonV2`, or `Carousel` for cards that must always render.

### I get an LID instead of a phone-number JID

WhatsApp now uses `@lid` addresses. Use `remoteJidAlt` / `senderAlt` when present and consult the LID/PN mapping helpers.

### The session was logged out

Delete the session folder and pair again. Never reconnect in a tight loop when the disconnect reason is `loggedOut`.

---

## 🙏 Credits

### Project Maintainer

**SAHAN OFC** — owner and developer of `zahan-baileys`. 🇱🇰 Sri Lanka · [www.sahanhost.qzz.io](https://www.sahanhost.qzz.io)

### Baileys / Upstream

This distribution builds on the Baileys ecosystem. The original upstream copyright and permission notice are preserved in [LICENSE](LICENSE), with additional provenance in [NOTICE.md](NOTICE.md).

### Fork Contributions / Sources

The integrated MessageBuilder keeps its original author watermark in `src/MessageBuilder/index.js`. The VoIP calling stack in `src/Voip/` derives from ShellTear's `baileys-caller` work, ported to ESM and adapted to run on the caller's existing socket.

### Open Source Contributors

Thanks to everyone who reported bugs, sent patches, and documented WhatsApp Web behaviour. Contributions are welcome through GitHub issues and pull requests.

---

<div align="center">
  <p><strong>zahan-baileys</strong> · v1.0.0 · MIT License · Made with 💜 in Sri Lanka</p>
  <p><a href="https://www.sahanhost.qzz.io">Official website</a> · <a href="https://github.com/Shan-droid770/zahan-baileys">GitHub</a> · <a href="https://www.npmjs.com/package/zahan-baileys">npm</a></p>
</div>
