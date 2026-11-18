// Sound samples as a WAV file (16 bit, one channel): voice lines after their
// fades (voice.js) and sound effects drawn ahead of time for the iPhone's own
// player (nativeSound.js). Pure.
export function wavBytes(samples, sampleRate) {
  const b = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(b)
  const text = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)) }
  text(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); text(8, 'WAVE'); text(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  text(36, 'data'); v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true)
  return new Uint8Array(b)
}
