export interface AudioFile {
  file: File
  audioBuffer: AudioBuffer
  format: string
  duration: number
  sampleRate: number
  fileName: string
  title: string
  artist: string
}
