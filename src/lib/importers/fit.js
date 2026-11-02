// FIT import (Garmin, COROS, Wahoo binary files): a compact reader for record, session and sport messages.
// Handles compressed timestamps, big and little endian, developer fields and chained files; skips what it doesn't need.
import { finish, modeFromSport } from './common.js'

const FIT_EPOCH_MS = 631065600000 // 1989-12-31 00:00 UTC
const SEMI = 180 / 2 ** 31
const MSG = { record: 20, session: 18, sport: 12 }
const SPORT = { 1: 'run', 2: 'ride', 11: 'walk', 17: 'hike', 21: 'ride' } // running, cycling, walking, hiking, e-biking

export function isFit(bytes) {
  return bytes.length >= 12 && bytes[8] === 0x2e && bytes[9] === 0x46 && bytes[10] === 0x49 && bytes[11] === 0x54
}

// One field value by FIT base type, or null when it's the "invalid" marker.
function read(dv, off, type, size, little) {
  switch (type & 0x1f) {
    case 0: case 2: case 13: { if (size < 1) return null; const v = dv.getUint8(off); return v === 0xff ? null : v }
    case 10: { if (size < 1) return null; const v = dv.getUint8(off); return v === 0 ? null : v }
    case 1: { if (size < 1) return null; const v = dv.getInt8(off); return v === 0x7f ? null : v }
    case 3: { if (size < 2) return null; const v = dv.getInt16(off, little); return v === 0x7fff ? null : v }
    case 4: { if (size < 2) return null; const v = dv.getUint16(off, little); return v === 0xffff ? null : v }
    case 11: { if (size < 2) return null; const v = dv.getUint16(off, little); return v === 0 ? null : v }
    case 5: { if (size < 4) return null; const v = dv.getInt32(off, little); return v === 0x7fffffff ? null : v }
    case 6: { if (size < 4) return null; const v = dv.getUint32(off, little); return v === 0xffffffff ? null : v }
    case 12: { if (size < 4) return null; const v = dv.getUint32(off, little); return v === 0 ? null : v }
    case 8: { if (size < 4) return null; const v = dv.getFloat32(off, little); return Number.isFinite(v) ? v : null }
    case 9: { if (size < 8) return null; const v = dv.getFloat64(off, little); return Number.isFinite(v) ? v : null }
    default: return null // strings, 64-bit and byte arrays: nothing we need
  }
}

export function parseFit(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  if (!isFit(bytes)) throw new Error("That file isn't a FIT file we can read.")
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const raw = []
  let sport = null
  let deviceDistanceM = null
  let pos = 0
  // A FIT file can hold several files back to back ("chained").
  while (pos + 12 <= bytes.length && isFit(bytes.subarray(pos))) {
    const headerSize = bytes[pos]
    const dataSize = dv.getUint32(pos + 4, true)
    let p = pos + headerSize
    const end = Math.min(p + dataSize, bytes.length)
    const defs = []
    let lastTs = null
    while (p < end) {
      const h = bytes[p++]
      let def
      let ts = null
      if (h & 0x80) {
        // Compressed timestamp header: 5 bits of seconds since the last full timestamp
        def = defs[(h >> 5) & 0x03]
        if (lastTs != null) {
          const off = h & 0x1f
          ts = (lastTs & ~0x1f) + off + (off >= (lastTs & 0x1f) ? 0 : 0x20)
          lastTs = ts
        }
      } else if (h & 0x40) {
        // Definition message
        if (p + 5 > end) break
        const local = h & 0x0f
        const little = bytes[p + 1] === 0
        const global = dv.getUint16(p + 2, little)
        const n = bytes[p + 4]
        p += 5
        const fields = []
        let size = 0
        for (let i = 0; i < n && p + 3 <= end; i++, p += 3) {
          fields.push({ num: bytes[p], size: bytes[p + 1], type: bytes[p + 2], at: size })
          size += bytes[p + 1]
        }
        if (h & 0x20) {
          // Developer fields: we don't read them, but we must skip their bytes
          const nd = p < end ? bytes[p++] : 0
          for (let i = 0; i < nd && p + 3 <= end; i++, p += 3) size += bytes[p + 1]
        }
        defs[local] = { global, little, fields, size }
        continue
      } else {
        def = defs[h & 0x0f]
      }
      if (!def) throw new Error("Part of that FIT file couldn't be read. Try exporting it again, or as GPX.")
      if (p + def.size > end) break
      const f = {}
      for (const fd of def.fields) {
        if (fd.num === 253 || def.global === MSG.record || def.global === MSG.session || def.global === MSG.sport) {
          f[fd.num] = read(dv, p + fd.at, fd.type, fd.size, def.little)
        }
      }
      p += def.size
      if (f[253] != null) { ts = f[253]; lastTs = ts }
      if (def.global === MSG.record) {
        const alt = f[78] != null ? f[78] / 5 - 500 : f[2] != null ? f[2] / 5 - 500 : NaN
        const cad = f[4] != null ? f[4] + (f[53] != null ? f[53] / 128 : 0) : NaN
        if (f[5] != null) deviceDistanceM = f[5] / 100
        raw.push({
          t: ts != null ? FIT_EPOCH_MS + ts * 1000 : NaN,
          lat: f[0] != null ? f[0] * SEMI : NaN,
          lng: f[1] != null ? f[1] * SEMI : NaN,
          alt,
          hr: f[3] ?? NaN,
          cadRaw: cad,
        })
      } else if ((def.global === MSG.session && f[5] != null) || (def.global === MSG.sport && f[0] != null && sport == null)) {
        sport = def.global === MSG.session ? f[5] : f[0]
      }
    }
    pos = pos + headerSize + dataSize + 2 // skip the file CRC
  }
  if (!raw.length) throw new Error('No GPS points found in that file.')
  const mode = modeFromSport(SPORT[sport] || 'run')
  return { ...finish(raw, mode, 'fit'), deviceDistanceM }
}
