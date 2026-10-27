import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import makeWASocket, { Browsers, DisconnectReason, useMultiFileAuthState } from '../src/index.js'

const args = process.argv.slice(2)
const checkOnly = args.includes('--check-only')
const phone = (args.find(a => !a.startsWith('--')) || process.env.PAIRING_PHONE || '').replace(/\D/g, '')

if (!phone) {
    console.error('Usage: node script/testpairing.js <number> [--check-only]')
    console.error('Example: node script/testpairing.js 6281234567890')
    console.error('The number can also be supplied through the PAIRING_PHONE environment variable.')
    console.error('')
    console.error('--check-only  only reports whether the server accepted or rejected the request; the code is never printed.')
    console.error('              Use it in environments where other people can read the logs.')
    process.exit(2)
}

/**
 * A throwaway session directory so a live bot's credentials are never touched.
 * Pairing writes creds as it goes, and reusing the bot's folder would replace
 * the identity it is already connected with.
 */
const session = join(tmpdir(), 'zahan-pairing-test-' + Date.now())

const log = (...parts) => console.log(new Date().toISOString().slice(11, 19), ...parts)

const cleanup = async () => rm(session, { recursive: true, force: true }).catch(() => {})
process.on('uncaughtException', async error => { console.error(error); await cleanup(); process.exit(1) })
process.on('unhandledRejection', async error => { console.error(error); await cleanup(); process.exit(1) })

const silent = { level: 'silent', trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {} }
silent.child = () => silent

const { state, saveCreds } = await useMultiFileAuthState(session)

const sock = makeWASocket({
    auth: state,
    browser: Browsers.macOS('Chrome'),
    printQRInTerminal: false,
    logger: silent
})

sock.ev.on('creds.update', saveCreds)

let finished = false
const close = async (exitCode) => {
    if (finished) return
    finished = true
    try { sock.end(undefined) } catch {}
    await cleanup()
    process.exit(exitCode)
}

sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) log('server sent a QR code (normal, ignore it)')

    if (connection === 'open') {
        log('PAIRING SUCCEEDED — device linked')
        await close(0)
    }

    if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode
        if (reason === DisconnectReason.restartRequired) {
            log('server asked for a restart (normal after successful pairing)')
            await close(0)
            return
        }
        log('connection closed, reason:', reason ?? lastDisconnect?.error?.message ?? '-')
        await close(1)
    }
})

const wait = ms => new Promise(r => setTimeout(r, ms))
await wait(3000)

log('requesting a pairing code for', phone)

try {
    const code = await sock.requestPairingCode(phone)
    console.log('')
    if (checkOnly) {
        log('registration ACCEPTED by server — reference recorded')
        log('Code not printed because --check-only is active.')
        log('The server accepted the request, so there is no rate limit or feature block.')
        await close(0)
    }
    console.log('  PAIRING CODE : ' + code.match(/.{1,4}/g).join('-'))
    console.log('')
    log('registration ACCEPTED by server — reference recorded')
    log('Check your phone now: a "New device is trying to connect" notification should appear.')
    log('If there is no notification, open WhatsApp > Linked Devices > Link with phone number,')
    log('then type the code above. If the code is accepted, registration really did succeed')
    log('and only the push notification failed.')
    console.log('')
    log('waiting up to 3 minutes...')
}
catch (error) {
    console.log('')
    log('REGISTRATION REJECTED')
    log('message:', error.message)
    log('code   :', error.output?.statusCode ?? error.data ?? '-')
    console.log('')
    if (String(error.message).includes('rate-overlimit')) {
        log('Meaning: too many attempts. Wait a few hours before trying again.')
    }
    else if (/not-allowed|not-acceptable|feature/i.test(String(error.message))) {
        log('Meaning: link-with-phone-number is not enabled for this account.')
    }
    else if (String(error.message).includes('international format')) {
        log('Meaning: wrong number format. Use the country code without a leading 0, e.g. 6281234567890.')
    }
    else {
        log('This is the raw server reply — before the fix, this error was never visible.')
    }
    await close(1)
}

await wait(180000)
if (!finished) {
    log('timed out, code was not used')
    await close(1)
}
