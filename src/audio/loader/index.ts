import { parseBlob } from 'music-metadata-browser'
import type { AudioFile } from './types'

const audioContext = new AudioContext()

export async function loadAudioFile(file: File): Promise<AudioFile> {
  const arrayBuffer = await file.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  const format = file.name.split('.').pop()?.toLowerCase() ?? 'unknown'

  let title = file.name.replace(/\.[^.]+$/, '')
  let artist = ''

  try {
    const metadata = await parseBlob(file)
    if (metadata.common.title) title = metadata.common.title
    if (metadata.common.artist) artist = metadata.common.artist
  } catch {
    // metadata no disponible, usar nombre de archivo
  }

  return {
    file,
    audioBuffer,
    format,
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
    fileName: file.name,
    title,
    artist,
  }
}
