import { detect } from 'beat-detection'
import type { AnalysisResult } from '../../song/config/types'
import { generateBpmOptions } from './bpm-adapter'

export function analyseAudio(audioBuffer: AudioBuffer): AnalysisResult {
  const samples = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate

  const result = detect(samples, {
    fs: sampleRate,
    minBpm: 60,
    maxBpm: 180,
  })

  const bpm = Math.round(result.bpm * 10) / 10
  const rawOffset = result.onsets.length > 0
    ? Math.round(result.onsets[0] * 1000)
    : 0
  const beatOffset = rawOffset < 30 ? 0 : rawOffset

  return {
    bpm,
    beatOffset,
    confidence: result.confidence,
    beats: Array.from(result.beats),
    bpmOptions: generateBpmOptions(bpm),
  }
}
