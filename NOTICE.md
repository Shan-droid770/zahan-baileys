# Zahan Baileys Notices

**Zahan Baileys** (`zahan-baileys`) is an independently maintained Baileys
distribution, maintained by **SAHAN OFC** in **Sri Lanka**.

- Version: 1.0.0
- Official website: <https://www.sahanhost.qzz.io>
- Repository: <https://github.com/Shan-droid770/zahan-baileys>

The upstream copyright and permission notices are preserved in `LICENSE`.
Portions of the codebase derive from or were influenced by upstream Baileys
work and subsequent forks, including the ItsLia lineage used as a development
base.

The integrated MessageBuilder retains its original author/watermark notice in
`src/MessageBuilder/index.js`.

The VoIP calling stack in `src/Voip/` derives from work by ShellTear, whose
`baileys-caller` project first showed that the WhatsApp Web VoIP WASM engine
could be driven from Node. It has been ported to ESM, reworked to run on the
caller's existing socket, and maintained here since. The WhatsApp Web resources
it drives are vendored unmodified under `src/assets/wasm/`, with their
provenance, checksums and capability surface described in the README there.

Zahan-specific maintenance, packaging, compatibility changes, integrations, and
ongoing development are maintained under the `zahan-baileys` package identity.
