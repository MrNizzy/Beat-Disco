import { generateConfig } from '../song/config/index'
import { convertToOgg } from '../audio/converter/index'
import { analyseAudio } from '../audio/analyser/index'
import type { ExportResult } from '../song/config/types'

export async function exportSong(
  audioBuffer: AudioBuffer,
  overrides?: Partial<ExportResult['config']>,
): Promise<ExportResult> {
  const analysis = analyseAudio(audioBuffer)
  const config = generateConfig(analysis, overrides)

  const oggBlob = await convertToOgg(audioBuffer)

  return { oggBlob, config }
}
