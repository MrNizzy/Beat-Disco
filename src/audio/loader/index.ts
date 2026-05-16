const audioContext = new AudioContext()

export async function loadAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer()
  return audioContext.decodeAudioData(arrayBuffer)
}

export function getFileFormat(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ext ?? 'unknown'
}
