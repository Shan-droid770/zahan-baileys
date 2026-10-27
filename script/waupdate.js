import { execFile } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import {
    diffBundle,
    liveRevision,
    loadBundle,
    pinnedRevision,
    readForkInterfaces,
    root,
    snapshotBundle,
    writePinnedRevision
} from './protobundle.js'
import { diffSnapshots, renderReport } from './diffbundle.js'

const execFileAsync = promisify(execFile)

const flag = name => process.argv.includes(name)
const option = (name, fallback) => {
    const at = process.argv.indexOf(name)
    return at !== -1 && process.argv[at + 1] ? process.argv[at + 1] : fallback
}

const cacheDir = option('--cache', process.env.WA_BUNDLE_CACHE || join(root, '.wa-bundle'))
const keep = Math.max(2, Number.parseInt(option('--keep', '3'), 10) || 3)
const apply = flag('--apply')
const reportDir = option('--out', join(root, '.wa-bundle'))

mkdirSync(cacheDir, { recursive: true })
mkdirSync(reportDir, { recursive: true })

const chunkCount = path => {
    try {
        return readdirSync(path).filter(name => name.endsWith('.js')).length
    }
    catch {
        return 0
    }
}

/**
 * `sw.js` and the chunk CDN can disagree during a rollout, so a directory named
 * after the advertised revision may hold an older bundle. `snapshot.json`
 * records what the chunks actually said; trust that over the folder name, or a
 * skewed capture sits in the cache forever pretending to be the new revision
 * and the real one never gets downloaded.
 */
const capturedRevision = (path, fallback) => {
    try {
        const meta = JSON.parse(readFileSync(join(path, 'snapshot.json'), 'utf8'))
        return Number.isInteger(meta.revision) ? meta.revision : fallback
    }
    catch {
        return fallback
    }
}

const snapshotDirs = () => readdirSync(cacheDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^\d+$/.test(entry.name))
    .map(entry => {
        const path = join(cacheDir, entry.name)
        return { revision: capturedRevision(path, Number.parseInt(entry.name, 10)), path }
    })
    .filter(entry => chunkCount(entry.path) > 0)
    .sort((a, b) => a.revision - b.revision)

const step = message => console.log(`• ${message}`)

const pinned = pinnedRevision()
step(`Pinned revision in repo: ${pinned}`)

/**
 * WhatsApp rolls a release out gradually, so different edge nodes answer with
 * different revisions at the same moment. Sampling once picks whichever node
 * replied and can walk backwards between runs; take the highest of a few.
 */
const samples = []
for (let attempt = 0; attempt < 5; attempt++) samples.push(await liveRevision())
const observed = snapshotDirs().map(entry => entry.revision)
const live = Math.max(...samples, pinned, ...observed)
const spread = [...new Set(samples)].sort((a, b) => b - a)
step(`Live WhatsApp Web revision: ${live}`)
if (spread.length > 1) step(`  several revisions served at once: ${spread.join(', ')}`)
if (live > Math.max(...samples)) step(`  this sample tops out at ${Math.max(...samples)}, using the higher revision observed earlier`)

let current = snapshotDirs().find(entry => entry.revision === live)

if (current) {
    step(`Revision ${live} snapshot already exists at ${current.path}, reusing it`)
}
else {
    const staging = join(cacheDir, '.staging')
    rmSync(staging, { recursive: true, force: true })
    step(`Downloading bundle revision ${live}`)
    const meta = await snapshotBundle({
        directory: staging,
        onProgress: (done, total) => {
            if (done % 100 === 0 || done === total) step(`  ${done}/${total} chunk`)
        }
    })
    if (meta.failed) step(`  ${meta.failed} chunks failed to download`)
    if (meta.revision !== live) {
        step(`  chunks served are actually revision ${meta.revision}, not ${live}`)
    }
    const target = join(cacheDir, String(meta.revision))
    rmSync(target, { recursive: true, force: true })
    renameSync(staging, target)
    step(`  snapshot saved at ${target}`)
    current = { revision: meta.revision, path: target }
}

const analyzed = current.revision
const previous = snapshotDirs().filter(entry => entry.path !== current.path && entry.revision !== analyzed).pop()
if (analyzed !== live) step(`Revision actually analysed: ${analyzed}`)

step('Reading protobuf specs from the bundle')
const bundle = await loadBundle({ directory: current.path })
const fork = readForkInterfaces()
const { missingMessage, gaps, undeclared } = diffBundle(bundle, fork)
const protoGaps = missingMessage.length + gaps.length

step(`Message fields: bundle ${bundle.messageFields.size}, WAProto ${fork.get('Message').size}`)
step(`Fields missing from WAProto: ${protoGaps}`)

let snapshotDiff
if (previous) {
    step(`Comparing with revision ${previous.revision} snapshot`)
    try {
        snapshotDiff = await diffSnapshots(previous.path, current.path)
    }
    catch (error) {
        step(`  snapshot ${previous.revision} could not be read (${error.message}), skipping cross-revision diff`)
        snapshotDiff = undefined
    }
}
else {
    step('No older snapshot yet, skipping cross-revision diff')
}

const run = async (label, file, env = {}) => {
    step(`Running ${label}`)
    try {
        const { stdout } = await execFileAsync(process.execPath, [join(root, 'script', file)], {
            cwd: root,
            env: { ...process.env, ...env },
            maxBuffer: 64 * 1024 * 1024
        })
        return { ok: true, output: stdout.trim() }
    }
    catch (error) {
        return { ok: false, output: String(error.stdout || '').trim() + '\n' + String(error.stderr || error.message).trim() }
    }
}

const verify = await run('verifyproto (round-trip encoder)', 'verifyproto.js', {
    PROTO_BUNDLE_DIR: current.path,
    PROTO_OFFLINE: '1'
})
step(verify.ok ? `  ${verify.output.split('\n').pop()}` : '  FAILED')

const protocolTouched = snapshotDiff ? snapshotDiff.protocolTouched : protoGaps > 0

let verdict
if (protoGaps > 0) verdict = 'needs-work'
else if (!verify.ok) verdict = 'blocked'
else if (analyzed !== pinned) verdict = protocolTouched ? 'bump-and-review' : 'bump-only'
else verdict = 'no-change'

const VERDICTS = {
    'no-change': 'The live revision matches the pinned one. Nothing to do.',
    'bump-only': 'The revision went up but no protocol surface changed. Just bump the version.',
    'bump-and-review': 'The revision went up AND a protocol surface changed. Read the diff before bumping.',
    'needs-work': 'WAProto is missing protobuf fields. Run sync:proto and verify again.',
    blocked: 'Round-trip encoder failed. Do NOT bump the version until this is green.'
}

const lines = []
lines.push('# WhatsApp Web update report')
lines.push('')
lines.push(`- Pinned revision: \`${pinned}\``)
lines.push(`- Live revision: \`${live}\``)
lines.push(`- Analysed revision: \`${analyzed}\``)
lines.push(`- Snapshot used: \`${current.path}\``)
lines.push(`- Comparison snapshot: \`${previous ? previous.path : 'none'}\``)
lines.push('')
lines.push(`## Verdict: \`${verdict}\``)
lines.push('')
lines.push(VERDICTS[verdict])
if (analyzed !== live) {
    lines.push('')
    lines.push(`The CDN still serves revision \`${analyzed}\` chunks even though \`sw.js\` advertises \`${live}\`, so the bundle for revision \`${live}\` has never been read and that number is not used in any conclusion.`)
}
lines.push('')
lines.push('## Protobuf checks')
lines.push('')
lines.push(`- \`Message\` fields: bundle ${bundle.messageFields.size}, WAProto ${fork.get('Message').size}`)
lines.push(`- Missing \`Message\` fields: ${missingMessage.length}`)
if (missingMessage.length) for (const [name, id] of missingMessage) lines.push(`  - \`${name}\` (field ${id})`)
lines.push(`- Types with missing fields: ${gaps.length}`)
if (gaps.length) for (const gap of gaps) lines.push(`  - \`${gap.type}\`: ${gap.fields.map(field => field.name).sort().join(', ')}`)
lines.push(`- Types not declared in WAProto at all: ${undeclared.length}`)
lines.push(`- Round-trip encoder: ${verify.ok ? 'passed' : 'FAILED'}`)
if (!verify.ok) {
    lines.push('')
    lines.push('```')
    lines.push(verify.output.slice(0, 4000))
    lines.push('```')
}
lines.push('')

if (snapshotDiff) {
    lines.push(renderReport(snapshotDiff).split('\n').slice(1).join('\n'))
}
else {
    lines.push('## Cross-revision diff')
    lines.push('')
    lines.push('Skipped: no previous revision snapshot in the cache.')
    lines.push('')
}

const markdown = lines.join('\n')
const markdownPath = join(reportDir, 'report.md')
const jsonPath = join(reportDir, 'report.json')
writeFileSync(markdownPath, markdown + '\n')
writeFileSync(jsonPath, JSON.stringify({
    pinned,
    live,
    analyzed,
    verdict,
    protoGaps,
    missingMessage,
    gaps: gaps.map(gap => ({ type: gap.type, fields: gap.fields.map(field => field.name) })),
    undeclared: undeclared.length,
    verifyPassed: verify.ok,
    protocolTouched,
    snapshot: current.path,
    comparedWith: previous ? previous.path : null,
    diff: snapshotDiff ?? null
}, null, 2) + '\n')

console.log('')
console.log(markdown)
console.log('')
step(`Report written to ${markdownPath} and ${jsonPath}`)

if (apply) {
    if (verdict === 'bump-only' || verdict === 'bump-and-review') {
        const touched = writePinnedRevision(analyzed)
        step(touched.length ? `Version bumped to ${analyzed} in: ${touched.join(', ')}` : 'No version files changed')
    }
    else {
        step(`--apply ignored: the verdict is \`${verdict}\`, not a bump`)
    }
}

const cached = snapshotDirs()
for (const entry of cached.slice(0, Math.max(0, cached.length - keep))) {
    step(`Cleaning up old snapshot ${entry.path}`)
    rmSync(entry.path, { recursive: true, force: true })
}

if (verdict === 'needs-work' || verdict === 'blocked') process.exitCode = 1
