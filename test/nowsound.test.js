// The admin "Now playing" card: the latest scene, music, passing sound and
// effect with their file names, kept through any run (lib/audio/testLog.js).
import { describe, it, expect } from 'vitest'
import { testLog, logTest, nowSound, clearNowSound } from '../src/lib/audio/testLog.js'

describe('now playing', () => {
  it('keeps the latest sound in each slot even when the play through log is off', () => {
    testLog.on = false
    clearNowSound()
    logTest('Scene', 'maheno-pier · recorded loop ambience/maheno-pier.mp3')
    logTest('Effect', 'maheno-reel · recorded sfx/maheno-reel.mp3')
    logTest('Effect', 'maheno-breach · recorded sfx/maheno-breach.mp3')
    logTest('Said', 'a line')
    expect(nowSound.scene.text).toContain('ambience/maheno-pier.mp3')
    expect(nowSound.effect.text).toContain('maheno-breach')
    expect(nowSound.music).toBe(null)
    expect(testLog.items).toEqual([])
  })
  it('starts empty for a new run', () => {
    logTest('Music', 'spy-chase · recorded track/spy-chase.mp3')
    clearNowSound()
    expect(Object.values(nowSound).every((v) => v === null)).toBe(true)
  })
})
