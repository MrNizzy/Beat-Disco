import { describe, it, expect } from 'vitest'

describe('analyseAudio', () => {
  it('returns valid structure with mock buffer', async () => {
    const { analyseAudio } = await import('./index')

    const length = 441000
    const samples = new Float32Array(length)
    for (let i = 0; i < length; i++) {
      samples[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.3
    }
    samples[0] = 0.5
    samples[1] = 0.5

    const buffer = {
      getChannelData: () => samples,
      sampleRate: 44100,
      duration: 10,
      numberOfChannels: 1,
      length,
    } as unknown as AudioBuffer

    const result = analyseAudio(buffer)
    expect(typeof result.bpm).toBe('number')
    expect(typeof result.beatOffset).toBe('number')
    expect(typeof result.confidence).toBe('number')
    expect(Array.isArray(result.beats)).toBe(true)
    expect(result.bpm).toBeGreaterThan(0)
  })
})
