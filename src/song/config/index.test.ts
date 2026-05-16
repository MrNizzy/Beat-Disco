import { describe, it, expect } from 'vitest'
import { generateConfig, configToJson } from './index'
import type { AnalysisResult } from './types'

describe('generateConfig', () => {
  const analysis: AnalysisResult = {
    bpm: 124,
    beatOffset: 50,
    confidence: 0.9,
    beats: [0.05, 0.53, 1.02],
    bpmOptions: [
      { bpm: 124, factor: 1, label: 'Original', recommended: true, isOriginal: true },
    ],
  }

  it('generates a config with required fields', () => {
    const config = generateConfig(analysis, { songName: 'Test Song' })
    expect(config.version).toBe(1)
    expect(config.uniqueId).toBeGreaterThan(0)
    expect(config.songName).toBe('Test Song')
    expect(config.tempo).toBe(124)
    expect(config.beatOffset).toBe(50)
    expect(config.customTempoSections).toEqual([])
  })

  it('allows overrides', () => {
    const config = generateConfig(analysis, { tempo: 128, beatOffset: 100 })
    expect(config.tempo).toBe(128)
    expect(config.beatOffset).toBe(100)
  })

  it('generates uniqueId and seed as numbers', () => {
    const config = generateConfig(analysis)
    expect(typeof config.uniqueId).toBe('number')
    expect(typeof config.seed).toBe('number')
  })
})

describe('configToJson', () => {
  it('produces valid JSON matching the game schema', () => {
    const config = generateConfig({
      bpm: 120, beatOffset: 0, confidence: 1, beats: [0],
      bpmOptions: [{ bpm: 120, factor: 1, label: 'Original', recommended: true, isOriginal: true }],
    } as AnalysisResult)
    const json = JSON.parse(configToJson(config))
    expect(json).toHaveProperty('version')
    expect(json).toHaveProperty('uniqueId')
    expect(json).toHaveProperty('songName')
    expect(json).toHaveProperty('performedBy')
    expect(json).toHaveProperty('writtenBy')
    expect(json).toHaveProperty('seed')
    expect(json).toHaveProperty('tempo')
    expect(json).toHaveProperty('customTempoSections')
    expect(json).toHaveProperty('beatOffset')
    expect(json).toHaveProperty('startSongOffset')
    expect(json).toHaveProperty('endSongOffset')
  })
})
