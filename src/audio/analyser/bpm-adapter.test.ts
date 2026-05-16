import { describe, it, expect } from 'vitest'
import { generateBpmOptions, getRecommendedOption, getClosestInRange } from './bpm-adapter'

describe('generateBpmOptions', () => {
  it('generates 5 options for a normal BPM', () => {
    const options = generateBpmOptions(128)
    expect(options).toHaveLength(5)
    expect(options[0].bpm).toBe(64)     // 0.5x
    expect(options[1].bpm).toBe(96)     // 0.75x
    expect(options[2].bpm).toBe(128)    // 1x
    expect(options[3].bpm).toBe(160)    // 1.25x
    expect(options[4].bpm).toBe(192)    // 1.5x
  })

  it('marks original and recommended options', () => {
    const options = generateBpmOptions(128)
    expect(options[2].isOriginal).toBe(true)
    expect(options[2].recommended).toBe(true) // 128 en 120-220
    expect(options[0].recommended).toBe(false) // 64 fuera de rango
  })

  it('marks option outside 120-220 as not recommended', () => {
    const options = generateBpmOptions(115)
    expect(options[2].isOriginal).toBe(true)
    expect(options[2].recommended).toBe(false) // 115 < 120
  })
})

describe('getRecommendedOption', () => {
  it('returns the one in 120-220 range', () => {
    const options = generateBpmOptions(80)
    const rec = getRecommendedOption(options)
    expect(rec.factor).toBe(1.5) // 80*1.5 = 120
  })

  it('falls back to original if none in range', () => {
    const options = generateBpmOptions(57)
    const rec = getRecommendedOption(options)
    expect(rec.isOriginal).toBe(true)
  })
})

describe('getClosestInRange', () => {
  it('clamps to 120 when no option is in range', () => {
    const options = generateBpmOptions(70)
    const closest = getClosestInRange(options)
    expect(closest.bpm).toBe(120) // clamp al mínimo del rango
  })
})
