import { useEffect, useRef } from 'react'

interface SongWaveformProps {
  audioBuffer: AudioBuffer
  currentTimeRef: React.MutableRefObject<number>
  duration: number
  playing: boolean
  onSeek: (time: number) => void
}

export default function SongWaveform({ audioBuffer, currentTimeRef, duration, playing, onSeek }: SongWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    function renderWaveform(cvs: HTMLCanvasElement, width: number) {
      const h = 100
      cvs.width = width
      cvs.height = h

      const offscreen = document.createElement('canvas')
      offscreen.width = width
      offscreen.height = h
      offscreenRef.current = offscreen
      const ctx = offscreen.getContext('2d')
      if (!ctx) return

      const data = audioBuffer.getChannelData(0)
      const step = Math.floor(data.length / width)

      const gradient = ctx.createLinearGradient(0, 0, width, 0)
      gradient.addColorStop(0, 'rgba(0, 240, 255, 0.5)')
      gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.5)')
      gradient.addColorStop(1, 'rgba(255, 45, 149, 0.5)')
      ctx.fillStyle = gradient

      const halfH = h / 2
      const ampScale = h * 0.4
      for (let i = 0; i < width; i++) {
        let min = 1, max = -1
        const start = i * step
        const end = Math.min(start + step, data.length)
        for (let j = start; j < end; j++) {
          const val = data[j]
          if (val < min) min = val
          if (val > max) max = val
        }
        ctx.fillRect(i, halfH + min * ampScale, 1, Math.max(1, (max - min) * ampScale))
      }
    }

    renderWaveform(canvas, container.clientWidth)

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width
        if (w > 0) renderWaveform(canvas, Math.floor(w))
      }
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      offscreenRef.current = null
    }
  }, [audioBuffer])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height

    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      if (offscreenRef.current) {
        ctx.drawImage(offscreenRef.current, 0, 0)
      }

      if (playing) {
        const x = (currentTimeRef.current / duration) * w

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.9)'
        ctx.lineWidth = 2
        ctx.shadowColor = 'rgba(0, 240, 255, 0.5)'
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
        ctx.shadowBlur = 0

        ctx.fillStyle = '#00f0ff'
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x - 5, 8)
        ctx.lineTo(x + 5, 8)
        ctx.closePath()
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, currentTimeRef, duration])

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = (x / rect.width) * duration
    onSeek(time)
  }

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        className="w-full cursor-pointer rounded-lg"
        height={100}
        onClick={handleClick}
        style={{ imageRendering: 'pixelated', display: 'block' }}
      />
    </div>
  )
}
