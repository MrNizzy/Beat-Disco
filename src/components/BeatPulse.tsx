import { useEffect, useRef } from 'react'

interface BeatPulseProps {
  beatPhaseRef: React.MutableRefObject<number>
  playing: boolean
}

export default function BeatPulse({ beatPhaseRef, playing }: BeatPulseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current)
      return
    }

    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) { rafRef.current = requestAnimationFrame(draw); return }

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const phase = beatPhaseRef.current
      const intensity = Math.max(0, 1 - phase * 4)

      if (intensity > 0.01) {
        const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5 * intensity)
        gradient.addColorStop(0, `rgba(255, 45, 149, ${intensity * 0.5})`)
        gradient.addColorStop(0.5, `rgba(255, 45, 149, ${intensity * 0.2})`)
        gradient.addColorStop(1, 'rgba(255, 45, 149, 0)')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, w, h)
      }

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, beatPhaseRef])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
      width={600}
      height={600}
      aria-hidden="true"
    />
  )
}
