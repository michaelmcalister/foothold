// Reads activity files from a watch or app (GPX, TCX, FIT, gzipped copies and a Strava bulk-export .zip).
// The format is worked out from the file's content first and its name second.
import { parseGpx } from './gpx.js'
import { parseTcx, isTcx } from './tcx.js'
import { parseFit, isFit } from './fit.js'
import { toSpm } from './common.js'

export { parseGpx, parseTcx, parseFit }

const EXT = /\.(gpx|tcx|fit)(\.gz)?$/i
const DUPLICATE_MS = 60_000 // two activities starting within a minute are the same one

const decoder = () => new TextDecoder('utf-8')
const head = (bytes) => decoder().decode(bytes.subarray(0, 4096))

export function sniff(bytes, name = '') {
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) return 'gzip'
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return 'zip'
  if (isFit(bytes)) return 'fit'
  const text = head(bytes)
  if (isTcx(text)) return 'tcx'
  if (/<gpx[\s>]/i.test(text)) return 'gpx'
  const ext = name.toLowerCase().match(/\.(gpx|tcx|fit|zip|gz)$/)?.[1]
  return ext === 'gz' ? 'gzip' : ext || null
}

async function decompress(bytes, format) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser can’t open compressed files. Unzip it first, then import the files inside.')
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

// The entries of a .zip, read straight from its central directory. Only
// stored and deflated entries (what Strava and every zip tool write).
export function zipEntries(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('That zip file looks damaged.')
  const count = dv.getUint16(eocd + 10, true)
  let p = dv.getUint32(eocd + 16, true)
  if (p === 0xffffffff) throw new Error('That zip file is too big to open here. Unzip it and import the activity files instead.')
  const out = []
  for (let i = 0; i < count && p + 46 <= bytes.length && dv.getUint32(p, true) === 0x02014b50; i++) {
    const method = dv.getUint16(p + 10, true)
    const size = dv.getUint32(p + 20, true)
    const nameLen = dv.getUint16(p + 28, true)
    const extraLen = dv.getUint16(p + 30, true)
    const commentLen = dv.getUint16(p + 32, true)
    const local = dv.getUint32(p + 42, true)
    const name = decoder().decode(bytes.subarray(p + 46, p + 46 + nameLen))
    p += 46 + nameLen + extraLen + commentLen
    out.push({
      name,
      method,
      async read() {
        const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true)
        const data = bytes.subarray(start, start + size)
        if (method === 0) return data
        if (method === 8) return decompress(data, 'deflate-raw')
        throw new Error('That zip uses a compression we can’t open.')
      },
    })
  }
  return out
}

// One file's bytes to a list of activities (a zip can hold many).
export async function parseBytes(bytes, name = '') {
  const kind = sniff(bytes, name)
  if (kind === 'gzip') return parseBytes(await decompress(bytes, 'gzip'), name.replace(/\.gz$/i, ''))
  if (kind === 'fit') return [{ ...parseFit(bytes), name }]
  if (kind === 'tcx') return [{ ...parseTcx(decoder().decode(bytes)), name }]
  if (kind === 'gpx') {
    const r = parseGpx(decoder().decode(bytes).trimStart())
    for (const pt of r.points) { if (pt.cad != null) pt.cad = toSpm(pt.cad, r.mode); if (pt.cad == null) delete pt.cad; if (pt.hr == null) delete pt.hr; if (pt.alt == null) delete pt.alt }
    return [{ ...r, startedAt: r.points[0].t, format: 'gpx', name }]
  }
  if (kind === 'zip') {
    const entries = zipEntries(bytes).filter((e) => EXT.test(e.name) && !e.name.startsWith('__MACOSX/'))
    if (!entries.length) throw new Error('No GPX, TCX or FIT files found in that zip.')
    const out = []
    for (const e of entries) {
      try {
        out.push(...(await parseBytes(await e.read(), e.name)))
      } catch (err) {
        out.push({ name: e.name, error: err.message })
      }
    }
    return out
  }
  throw new Error('We can’t read that file. Try a GPX, TCX or FIT file.')
}

// Files from a file input to activities ready to save, oldest first, with
// duplicates (same start time as each other or as `known` start times) set aside.
export async function readImports(files, known = []) {
  const found = []
  const problems = []
  for (const file of files) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      for (const r of await parseBytes(bytes, file.name || '')) {
        if (r.error) problems.push({ name: r.name, message: r.error })
        else if (r.points.length < 10) problems.push({ name: r.name, message: 'That activity is too short to save.' })
        else found.push(r)
      }
    } catch (err) {
      problems.push({ name: file.name || 'File', message: err.message })
    }
  }
  found.sort((a, b) => a.startedAt - b.startedAt)
  const seen = [...known]
  const ready = []
  let duplicates = 0
  for (const r of found) {
    if (seen.some((t) => Math.abs(t - r.startedAt) < DUPLICATE_MS)) { duplicates++; continue }
    seen.push(r.startedAt)
    ready.push(r)
  }
  return { ready, duplicates, problems }
}
