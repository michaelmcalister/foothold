// Importer tests: TCX and FIT parsing (built in the test, no binaries), sniffing, gzip, zip and multi-file batches.
import { describe, it, expect } from 'vitest'
import { parseTcx, parseFit, sniff, parseBytes, zipEntries, readImports } from '../src/lib/importers/index.js'
import { toSpm, modeFromSport } from '../src/lib/importers/common.js'

const START = Date.UTC(2026, 9, 25, 20, 0, 0) // a Sunday morning in Sydney
const ORIGIN = { lat: -33.9, lng: 151.15 }
const enc = (s) => new TextEncoder().encode(s)

function tcx({ sport = 'Running', n = 30, start = START, hr = true, runCad = 85, prefix = '', lead = '' } = {}) {
  const P = prefix ? `${prefix}:` : ''
  const pts = Array.from({ length: n }, (_, i) => `
    <${P}Trackpoint>
      <${P}Time>${new Date(start + i * 5000).toISOString()}</${P}Time>
      <${P}Position><${P}LatitudeDegrees>${(ORIGIN.lat + i * 0.0001).toFixed(6)}</${P}LatitudeDegrees><${P}LongitudeDegrees>${ORIGIN.lng}</${P}LongitudeDegrees></${P}Position>
      <${P}AltitudeMeters>${20 + i * 0.5}</${P}AltitudeMeters>
      <${P}DistanceMeters>${i * 11}</${P}DistanceMeters>
      ${hr ? `<${P}HeartRateBpm><${P}Value>${140 + (i % 5)}</${P}Value></${P}HeartRateBpm>` : ''}
      ${runCad ? `<${P}Extensions><ns3:TPX><ns3:Speed>2.2</ns3:Speed><ns3:RunCadence>${runCad}</ns3:RunCadence></ns3:TPX></${P}Extensions>` : ''}
    </${P}Trackpoint>`).join('')
  // An indoor point with no position, as watches write while waiting for GPS
  const indoor = `<${P}Trackpoint><${P}Time>${new Date(start - 5000).toISOString()}</${P}Time><${P}HeartRateBpm><${P}Value>90</${P}Value></${P}HeartRateBpm></${P}Trackpoint>`
  return `${lead}<?xml version="1.0" encoding="UTF-8"?>
<${P}TrainingCenterDatabase xmlns${prefix ? `:${prefix}` : ''}="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
  <${P}Activities><${P}Activity Sport="${sport}"><${P}Id>${new Date(start).toISOString()}</${P}Id>
    <${P}Lap StartTime="${new Date(start).toISOString()}"><${P}Track>${indoor}${pts}</${P}Track></${P}Lap>
  </${P}Activity></${P}Activities>
</${P}TrainingCenterDatabase>`
}

// ---- a minimal FIT writer, just enough to exercise the parser ----
const SEMI = 2 ** 31 / 180
const FIT_EPOCH_S = 631065600
class W {
  constructor() { this.b = [] }
  u8(v) { this.b.push(v & 0xff); return this }
  u16(v, be = false) { return be ? this.u8(v >> 8).u8(v) : this.u8(v).u8(v >> 8) }
  u32(v, be = false) { const x = v >>> 0; return be ? this.u8(x >>> 24).u8(x >>> 16).u8(x >>> 8).u8(x) : this.u8(x).u8(x >>> 8).u8(x >>> 16).u8(x >>> 24) }
  def(local, global, fields, { be = false, dev = [] } = {}) {
    this.u8(0x40 | (dev.length ? 0x20 : 0) | local).u8(0).u8(be ? 1 : 0).u16(global, be).u8(fields.length)
    for (const [num, size, type] of fields) this.u8(num).u8(size).u8(type)
    if (dev.length) { this.u8(dev.length); for (const [num, size, idx] of dev) this.u8(num).u8(size).u8(idx) }
    return this
  }
}
function fitBytes(write) {
  const w = new W()
  write(w)
  const data = w.b
  const h = new W().u8(14).u8(0x20).u16(2132).u32(data.length).u8(0x2e).u8(0x46).u8(0x49).u8(0x54).u16(0)
  return new Uint8Array([...h.b, ...data, 0, 0])
}
const fitTs = (ms) => Math.round(ms / 1000) - FIT_EPOCH_S
const latAt = (i) => Math.round((ORIGIN.lat + i * 0.00003) * SEMI)
const lng = Math.round(ORIGIN.lng * SEMI)

function sampleFit({ sport = 1, sportMsg = null, n = 40, start = START } = {}) {
  return fitBytes((w) => {
    if (sportMsg != null) w.def(3, 12, [[0, 1, 0x00]]).u8(3).u8(sportMsg)
    // local 0: full records, little endian
    w.def(0, 20, [[253, 4, 0x86], [0, 4, 0x85], [1, 4, 0x85], [78, 4, 0x86], [3, 1, 0x02], [4, 1, 0x02], [53, 1, 0x02], [5, 4, 0x86]])
    let i = 0
    for (; i < n / 4; i++) w.u8(0).u32(fitTs(start + i * 1000)).u32(latAt(i)).u32(lng).u32((30 + 500) * 5).u8(150).u8(85).u8(64).u32(i * 330)
    // local 1: records with no timestamp field, sent with compressed timestamp headers
    w.def(1, 20, [[0, 4, 0x85], [1, 4, 0x85], [2, 2, 0x84], [3, 1, 0x02]])
    for (; i < n / 2; i++) w.u8(0x80 | (1 << 5) | (fitTs(start + i * 1000) & 0x1f)).u32(latAt(i)).u32(lng).u16((31 + 500) * 5).u8(152)
    // local 2: big endian, with a developer field we must skip
    w.def(2, 20, [[253, 4, 0x86], [0, 4, 0x85], [1, 4, 0x85], [3, 1, 0x02]], { be: true, dev: [[0, 2, 0]] })
    for (; i < (3 * n) / 4; i++) w.u8(2).u32(fitTs(start + i * 1000), true).u32(latAt(i), true).u32(lng, true).u8(155).u8(0xaa).u8(0xbb)
    // an indoor record with invalid position, then the rest
    w.u8(2).u32(fitTs(start + i * 1000) , true).u32(0x7fffffff, true).u32(0x7fffffff, true).u8(156).u8(0).u8(0)
    for (; i < n; i++) w.u8(0).u32(fitTs(start + i * 1000 + 500)).u32(latAt(i)).u32(lng).u32(0xffffffff).u8(0xff).u8(0xff).u8(0xff).u32(i * 330)
    // session with sport, and a string field (name) we ignore
    w.def(4, 18, [[253, 4, 0x86], [5, 1, 0x00], [6, 1, 0x00], [100, 4, 0x07]]).u8(4).u32(fitTs(start + n * 1000)).u8(sport).u8(0).u8(65).u8(66).u8(67).u8(0)
  })
}

async function gzip(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(s).arrayBuffer())
}
async function deflateRaw(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(s).arrayBuffer())
}
// A zip with one stored and one deflated entry (CRCs are left at 0: the reader doesn't check them).
async function zip(files) {
  const w = new W()
  const central = []
  for (const { name, data, deflate } of files) {
    const body = deflate ? await deflateRaw(data) : data
    const nm = enc(name)
    const at = w.b.length
    w.u32(0x04034b50).u16(20).u16(0).u16(deflate ? 8 : 0).u16(0).u16(0).u32(0).u32(body.length).u32(data.length).u16(nm.length).u16(0)
    w.b.push(...nm, ...body)
    central.push({ nm, at, len: body.length, raw: data.length, deflate })
  }
  const cdAt = w.b.length
  for (const c of central) {
    w.u32(0x02014b50).u16(20).u16(20).u16(0).u16(c.deflate ? 8 : 0).u16(0).u16(0).u32(0).u32(c.len).u32(c.raw).u16(c.nm.length).u16(0).u16(0).u16(0).u16(0).u32(0).u32(c.at)
    w.b.push(...c.nm)
  }
  const cdLen = w.b.length - cdAt
  w.u32(0x06054b50).u16(0).u16(0).u16(central.length).u16(central.length).u32(cdLen).u32(cdAt).u16(0)
  return new Uint8Array(w.b)
}
const file = (name, data) => ({ name, arrayBuffer: async () => (typeof data === 'string' ? enc(data) : data).buffer })

describe('TCX', () => {
  it('reads time, position, altitude, heart rate and run cadence (doubled to steps per minute)', () => {
    const r = parseTcx(tcx())
    expect(r.format).toBe('tcx')
    expect(r.mode).toBe('run')
    expect(r.points).toHaveLength(30) // the indoor point is dropped
    expect(r.startedAt).toBe(START)
    expect(r.points[0]).toMatchObject({ lat: -33.9, lng: 151.15, t: START, alt: 20, hr: 140, cad: 170 })
  })
  it('maps sport to mode and copes with namespace prefixes and leading whitespace', () => {
    expect(parseTcx(tcx({ sport: 'Biking', runCad: 0 })).mode).toBe('ride')
    expect(parseTcx(tcx({ sport: 'Other', prefix: 'tcx', lead: '   \n' })).mode).toBe('run')
    expect(parseTcx(tcx({ prefix: 'tcx' })).points).toHaveLength(30)
  })
  it('leaves heart rate and cadence off when missing', () => {
    const p = parseTcx(tcx({ hr: false, runCad: 0 })).points[0]
    expect(p.hr).toBeUndefined()
    expect(p.cad).toBeUndefined()
  })
  it('explains files it cannot use', () => {
    expect(() => parseTcx('<gpx></gpx>')).toThrow(/TCX/)
    expect(() => parseTcx('<TrainingCenterDatabase></TrainingCenterDatabase>')).toThrow(/No GPS points/)
    expect(() => parseTcx(tcx().replace(/<Time>[^<]*<\/Time>/g, ''))).toThrow(/timestamps/)
    expect(() => parseTcx(tcx().replace(/<Position>[\s\S]*?<\/Position>/g, ''))).toThrow(/Indoor/)
  })
})

describe('FIT', () => {
  it('reads records with full and compressed timestamps, both byte orders, and skips developer fields', () => {
    const r = parseFit(sampleFit())
    expect(r.format).toBe('fit')
    expect(r.mode).toBe('run')
    expect(r.points).toHaveLength(40) // the invalid-position record is dropped
    expect(r.startedAt).toBe(START)
    for (let i = 1; i < r.points.length; i++) expect(r.points[i].t).toBeGreaterThan(r.points[i - 1].t)
    expect(r.points[0].lat).toBeCloseTo(-33.9, 5)
    expect(r.points[0].lng).toBeCloseTo(151.15, 5)
    expect(r.points[0]).toMatchObject({ alt: 30, hr: 150, cad: 171 }) // 85.5 strides a minute per foot
    expect(r.points[12]).toMatchObject({ t: START + 12000, alt: 31, hr: 152 }) // compressed timestamp
    expect(r.points[25]).toMatchObject({ t: START + 25000, hr: 155 }) // big endian with a developer field
    expect(r.points[35].alt).toBeUndefined()
    expect(r.deviceDistanceM).toBeCloseTo(39 * 3.3)
  })
  it('takes the mode from the session, or the sport message when there is no session sport', () => {
    expect(parseFit(sampleFit({ sport: 2 })).mode).toBe('ride')
    expect(parseFit(sampleFit({ sport: 11 })).mode).toBe('walk')
    expect(parseFit(sampleFit({ sport: 0xff, sportMsg: 17 })).mode).toBe('walk')
  })
  it('handles compressed timestamps that roll over 32 seconds', () => {
    const start = START + 29000 // offsets 29, 30, 31, 0, 1...
    const r = parseFit(sampleFit({ start }))
    expect(r.points[10].t).toBe(start + 10000)
    expect(r.points[19].t).toBe(start + 19000)
  })
  it('explains files it cannot use', () => {
    expect(() => parseFit(enc('hello world, not a fit'))).toThrow(/FIT/)
    const bad = fitBytes((w) => w.u8(0x05).u8(1).u8(2)) // data for a message never defined
    expect(() => parseFit(bad)).toThrow(/couldn't be read/)
    const indoor = fitBytes((w) => { w.def(0, 20, [[253, 4, 0x86], [3, 1, 0x02]]); for (let i = 0; i < 5; i++) w.u8(0).u32(fitTs(START + i * 1000)).u8(120) })
    expect(() => parseFit(indoor)).toThrow(/Indoor/)
  })
})

describe('sniffing and batches', () => {
  it('works out the format from content, then the file name', async () => {
    expect(sniff(sampleFit(), 'run.bin')).toBe('fit')
    expect(sniff(enc(tcx()), 'activity.xml')).toBe('tcx')
    expect(sniff(enc('<?xml version="1.0"?><gpx version="1.1">'), 'a.txt')).toBe('gpx')
    expect(sniff(await gzip(enc('x')), 'a')).toBe('gzip')
    expect(sniff(await zip([{ name: 'a.gpx', data: enc('x') }]), 'export')).toBe('zip')
    expect(sniff(enc('nothing to see'), 'x.fit')).toBe('fit')
    expect(sniff(enc('nothing to see'), 'notes.txt')).toBe(null)
    await expect(parseBytes(enc('nothing to see'), 'notes.txt')).rejects.toThrow(/GPX, TCX or FIT/)
  })
  it('opens gzipped files and Strava style zips', async () => {
    const [g] = await parseBytes(await gzip(sampleFit()), '123.fit.gz')
    expect(g.format).toBe('fit')
    const z = await zip([
      { name: 'activities/1.tcx', data: enc(tcx({ start: START })) },
      { name: 'activities/2.fit.gz', data: await gzip(sampleFit({ start: START + 86400000 })), deflate: true },
      { name: 'activities/3.tcx', data: enc(tcx({ start: START + 2 * 86400000 })), deflate: true },
      { name: 'activities/4.tcx', data: enc('<TrainingCenterDatabase></TrainingCenterDatabase>') },
      { name: 'profile.csv', data: enc('a,b') },
    ])
    expect(zipEntries(z).map((e) => e.name)).toHaveLength(5)
    const out = await parseBytes(z, 'export.zip')
    expect(out.map((r) => r.format || 'error')).toEqual(['tcx', 'fit', 'tcx', 'error'])
    expect(out[3].error).toMatch(/No GPS points/)
  })
  it('imports several files oldest first, skipping duplicates and reporting problems', async () => {
    const files = [
      file('late.tcx', tcx({ start: START + 3 * 3600000 })),
      file('early.fit', sampleFit({ start: START })),
      file('copy.tcx', tcx({ start: START + 20000 })), // same run as early.fit
      file('known.tcx', tcx({ start: START + 86400000 })), // already saved
      file('short.tcx', tcx({ n: 5, start: START + 7200000 })),
      file('broken.fit', enc('nope')),
    ]
    const { ready, duplicates, problems } = await readImports(files, [START + 86400000 + 30000])
    expect(ready.map((r) => r.name)).toEqual(['early.fit', 'late.tcx'])
    expect(duplicates).toBe(2)
    expect(problems.map((p) => p.name).sort()).toEqual(['broken.fit', 'short.tcx'])
  })
})

describe('helpers', () => {
  it('converts cadence to steps per minute', () => {
    expect(toSpm(85, 'run')).toBe(170)
    expect(toSpm(172, 'run')).toBe(172)
    expect(toSpm(55, 'walk')).toBe(110)
    expect(toSpm(110, 'walk')).toBe(110)
    expect(toSpm(88, 'ride')).toBe(88)
    expect(toSpm(0, 'run')).toBeUndefined()
  })
  it('maps sport names', () => {
    expect(modeFromSport('Biking')).toBe('ride')
    expect(modeFromSport('Hiking')).toBe('walk')
    expect(modeFromSport('Running')).toBe('run')
  })
})
