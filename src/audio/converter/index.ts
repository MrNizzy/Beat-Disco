import ogg from '@audio/encode-ogg'

export async function convertToOgg(
  audioBuffer: AudioBuffer,
  quality = 5,
): Promise<Blob> {
  const channelData: Float32Array[] = []
  for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
    channelData.push(audioBuffer.getChannelData(c))
  }

  const encoder = await ogg({
    sampleRate: audioBuffer.sampleRate,
    channels: audioBuffer.numberOfChannels,
    quality,
  })

  const chunk = encoder.encode(channelData)
  const tail = encoder.flush()
  encoder.free()

  const parts = new Uint8Array(chunk.length + tail.length)
  parts.set(chunk)
  parts.set(tail, chunk.length)

  return new Blob([parts], { type: 'audio/ogg' })
}
