import type { SongConfig, AnalysisResult } from './types'

export function generateConfig(
  analysis: AnalysisResult,
  overrides?: Partial<SongConfig>,
): SongConfig {
  const config: SongConfig = {
    version: 1,
    uniqueId: Math.floor(Math.random() * 2_000_000_000),
    songName: overrides?.songName ?? 'Unknown',
    performedBy: overrides?.performedBy ?? [],
    writtenBy: overrides?.writtenBy ?? [],
    seed: Math.floor(Math.random() * 4_000_000_000),
    tempo: analysis.bpm,
    customTempoSections: [],
    beatOffset: analysis.beatOffset,
    startSongOffset: overrides?.startSongOffset ?? 0,
    endSongOffset: overrides?.endSongOffset ?? 0,
    ...overrides,
  }

  return config
}

export function configToJson(config: SongConfig): string {
  return JSON.stringify(config, null, 2)
}
