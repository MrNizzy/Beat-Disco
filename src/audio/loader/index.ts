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
    console.log('Metadata:', metadata)

    if (metadata.common.title) title = metadata.common.title

    if (metadata.common.artist) {
      artist = metadata.common.artist
    } else if (metadata.common.artists?.length) {
      artist = metadata.common.artists[0]
    } else if (metadata.common.albumartist) {
      artist = metadata.common.albumartist
    } else if (metadata.native?.vorbis) {
      const performer = metadata.native.vorbis.find(
        (t) => t.id.toUpperCase() === 'PERFORMER',
      )
      if (performer) artist = String(performer.value)
    }
  } catch (err) {
    console.warn('Metadata parse failed:', err)
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
