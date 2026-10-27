# Agent guide: applying WhatsApp Web updates to Zahan Baileys

This file is the working instruction set for an AI agent (ChatGPT Codex, Claude
Code, or similar) asked to inspect and apply WhatsApp Web updates to this fork.
If you are using a plain chat version of ChatGPT, copy this whole file as a
*system prompt* / *custom instruction*, then provide the command output below
as material for analysis.

This repo is an **independently maintained Baileys distribution**. Never compare
it with WhiskeySockets/Baileys or any other fork, never copy code from there,
and never assume upstream behaviour applies here. The only sources of truth are
the **live WhatsApp Web JavaScript bundle** and the code in this repo.

---

## 1. Hard rules

Break any of these and your work cannot be used.

1. **Never invent findings.** Every claim about WhatsApp Web must come from a
   string you actually found in the bundle. If you did not find it, say "not
   found", not "most likely".
2. **An extractor returning zero lines is not proof that nothing changed.**
   Before concluding "there is no new X", make sure extractor X really produces
   data on both bundles. The `wa:update` report includes `Current total` for
   every surface — if a total is 0, the extractor is broken, not WhatsApp.
3. **Never bump the version if `verify:proto` fails.** The round-trip encoder
   is the last guard against a protobuf field with the wrong number or type.
4. **Never add protobuf fields by hand.** Use `npm run sync:proto`. That script
   is additive and idempotent; a human once created duplicate fields
   (`faviconMmsMetadata` vs `faviconMMSMetadata` at field 33) that only the
   round-trip test caught. Since revision `1047020237` the script also
   generates new `Message` members — it used to give up there and ask for
   manual regeneration. Every `Message` member is a proto3 optional, i.e. a
   synthetic oneof with a single member, exactly the same shape as an optional
   field on any other type; what used to be missing was only its spec, because
   `diffBundle` reports `Message` fields as just a name and a number. The spec
   is now taken from `bundle.specs.get('Message')` and fed into the same
   codegen.
5. **Code you write must not use `//` or `/** */` comments** unless the comment
   explains something that truly cannot be read from the code itself. Markdown
   documents are exempt from this rule.
6. **Commit on the working branch.** Do not create extra branches or open a PR
   unless explicitly asked.
7. **Commit identity must belong to the repo owner, not the agent:**
   ```
   git -c commit.gpgsign=false \
       -c user.name="SAHAN OFC" \
       -c user.email="176169758+Shan-droid770@users.noreply.github.com" \
       commit -am "<message>"
   ```
   No `Co-Authored-By` trailer, and no mention of any model or tool in the
   commit message.

---

## 2. Workflow: one command

```bash
npm run wa:update
```

That script runs the entire chain:

1. Reads the pinned revision from `src/Defaults/index.js`.
2. Fetches the live revision from `https://web.whatsapp.com/sw.js`.
3. Downloads the whole chunk bundle (about 540 files, about 80 MB) into
   `.wa-bundle/<revision>/`. If a snapshot for that revision already exists,
   it is reused without downloading.
4. Parses the protobuf specs out of the bundle and compares them with
   `WAProto/index.d.ts`.
5. Compares the new snapshot with the previous revision's snapshot across
   every protocol surface.
6. Runs a round-trip encoder over roughly 2870 fields.
7. Writes `.wa-bundle/report.md` and `.wa-bundle/report.json`.

Options:

| Option | Meaning |
|---|---|
| `--apply` | Bump the pinned revision, but only when the verdict is `bump-only` or `bump-and-review` |
| `--cache <dir>` | Snapshot cache location (default `.wa-bundle/`) |
| `--out <dir>` | Report output location |
| `--keep <n>` | Number of snapshots to keep (minimum 2, default 3) |

Supporting commands:

| Command | Purpose |
|---|---|
| `npm run wa:diff -- <old-dir> <new-dir>` | Diff two snapshots only |
| `npm run check:proto` | Check for protobuf gaps only |
| `npm run sync:proto` | Add missing protobuf fields to WAProto |
| `npm run verify:proto` | Round-trip encoder only |
| `npm run verify:mex` | Match every `w:mex` query with the persisted queries in the bundle |
| `npm run fetch:bundle -- <dir>` | Download the raw bundle into a directory |

The `PROTO_BUNDLE_DIR` environment variable makes every script read from a
local directory, and `PROTO_OFFLINE=1` skips the live revision fetch — useful
when the network is blocked.

> **Rollout note.** `sw.js` and the chunk CDN can disagree while a release is
> being rolled out gradually: `sw.js` already advertises the new revision while
> the chunks being served are still the old one. The report distinguishes them
> as `Live revision` (advertised) and `Analysed revision` (actually
> downloaded). Every conclusion — including `--apply` — uses the analysed
> revision, because a revision whose bundle has never been read must not be
> bumped.

> **Network note.** In some environments Node's built-in `fetch` is rejected
> with `403` by web.whatsapp.com while `curl` succeeds. `script/protobundle.js`
> already falls back to `curl` automatically when that happens, so you do not
> need to handle it yourself. If both fail, report it as it is — never disable
> TLS verification and never guess the contents of the bundle.

---

## 3. Reading the verdict

`report.json` contains a `verdict` field with one of these values.

| Verdict | Meaning | Your action |
|---|---|---|
| `no-change` | Live revision equals the pinned one | Nothing. Just report it. |
| `bump-only` | Revision went up, no protocol surface changed | Bump the version, commit `chore: WA update, client revision <n>` |
| `bump-and-review` | Revision went up **and** a protocol surface changed | Read the diff first. Decide what has to be applied to the fork, then bump. |
| `needs-work` | WAProto is missing protobuf fields | `npm run sync:proto`, then `npm run verify:proto`, then rerun `wa:update`. If the script refuses because a field's spec is missing from the bundle, that is an extractor bug — do not patch it by hand. |
| `blocked` | Round-trip encoder failed | **Do not bump.** Find the broken field from the verification output. |

---

## 4. Which surfaces matter

This is the part that is most often misunderstood. Most of the WhatsApp Web
bundle is interface code that **cannot** affect a Baileys client. What decides
whether an update is relevant is whether it touches what is sent to the server.

**Important — if this changes, the fork may need to change:**

| Surface | Why it matters |
|---|---|
| Protobuf specs | Message contents. A new field means a new message feature. |
| Stanza tags (`smax("...")`) | The shape of the XMPP elements sent and received |
| Stanza attributes | A new attribute on an existing stanza often means a behaviour change |
| `xmlns` | A new query namespace means a new feature group |
| MEX operations | GraphQL persisted queries — their ids must match exactly |
| Media paths (`/mms/…`) | Upload/download endpoints |

**Not important — ignore, do not report as an "update":**

- React/UI modules (`*.react`), translation strings, icons, animations.
- Telemetry modules: QPL, Flipper, Sapienz, `QuickLogEvents`, logging module
  names such as `world_remixing`.
- Client-side media encoders (mozjpeg WASM, OffscreenCanvas, thumbnail
  generator). These change how the browser encodes images, not what is sent.
- Browser-local storage (OPFS, CacheStorage, IndexedDB).
- AB props / gating. These only enable features inside WhatsApp Web's own UI
  and do **not** restrict what another client may send. This repo once
  mistakenly concluded "photo polls are channels only" from the AB prop
  `channel_photo_poll_*`; that was wrong, and a real relay dump proved it.

The `Touches the protocol` column in the report already applies this split
automatically, but you should still read the list of new modules to make sure
nothing escaped classification.

---

## 5. If something really did change

The order that has proven to work:

1. **Find its definition in the bundle.** Search for the module name
   `__d("Name"` and read the whole module body. Do not draw conclusions from a
   200-character snippet.
2. **Trace it to a concrete caller.** A new argument value means nothing unless
   you know the value actually passed. If `grep` only finds the definition, you
   are not done — find the UI component that calls it.
3. **Compare with the fork's implementation**, element by element, attribute by
   attribute, including the order of child elements.
4. **Apply the smallest possible change**, then run `npm run verify:proto`.
5. **Report what you could not prove.** If a fix might not solve the issue the
   user reported, say so.

---

## 6. Traps that have caught us before

This list comes from real mistakes in this repo. Read it before starting.

- **Colliding leaf names.** Two protobuf types can share the same final name in
  different namespaces. Comparisons must use fully qualified names and be
  case-insensitive.
- **snake_case names in the bundle vs camelCase in WAProto.** Normalise before
  comparing.
- **Quoted keywords in `.d.ts`** (`"static"?:`) slip past naive regexes.
- **proto3 drops default values.** A boolean field with value `false` is not
  sent by WhatsApp. This fork once sent fields 10 and 11 as explicit `false`
  and produced a 50-byte payload against WhatsApp's 46 bytes, which made photo
  polls fail to render.
- **Wire type differences.** `'0'` (string) and `new Uint8Array(1)` (one zero
  byte) are different values: `0x30` versus `0x00`.
- **Phone number normalisation.** WhatsApp Web always assembles a number as
  country code + national number in plain digits. Anything you receive from a
  user must be normalised before it becomes a JID.
- **`getMessage` is not the only source.** For resending, the socket's internal
  cache is more reliable.

---

## 7. Checklist before pushing

- [ ] `npm run wa:update` finished and its verdict is understood
- [ ] `npm run verify:proto` passed
- [ ] `npm run verify:mex` passed if you touched `src/Socket` or `src/Types/Mex.js`
- [ ] `node --check` passes for every file you touched
- [ ] No files from `.wa-bundle/` were committed
- [ ] The commit message explains **why**, not only **what**
- [ ] The commit uses the repo owner's identity
- [ ] Your report to the user clearly separates what is **proven**, what is
      **assumed**, and what **cannot be confirmed**

Commit message format used by this repo:

```
chore: WA update, client revision 1045732124

fix(<area>): <one-line lowercase summary>

<paragraph explaining the evidence from the bundle and the reason for the change>
```
