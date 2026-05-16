import { configToJson, generateConfig } from '../song/config/index'
import { convertToOgg } from '../audio/converter/index'
import { analyseAudio } from '../audio/analyser/index'
import { loadAudioFile } from '../audio/loader/index'
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

export function downloadExport(result: ExportResult, baseName: string): void {
  const oggUrl = URL.createObjectURL(result.oggBlob)
  const oggLink = document.createElement('a')
  oggLink.href = oggUrl
  oggLink.download = `${baseName}.ogg`
  oggLink.click()
  URL.revokeObjectURL(oggUrl)

  const jsonBlob = new Blob([configToJson(result.config)], { type: 'application/json' })
  const jsonUrl = URL.createObjectURL(jsonBlob)
  const jsonLink = document.createElement('a')
  jsonLink.href = jsonUrl
  jsonLink.download = `${baseName}.json`
  jsonLink.click()
  URL.revokeObjectURL(jsonUrl)
}

export { loadAudioFile }
