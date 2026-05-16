import { useEffect, useRef } from 'react'

interface EdgeWavesProps {
  analyserRef: React.MutableRefObject<AnalyserNode | null>
  playing: boolean
}

function smoothData(raw: Uint8Array, count: number): Float32Array {
  const grouped = new Float32Array(count)
  const groupSize = Math.floor(raw.length / count)
  for (let i = 0; i < count; i++) {
    let sum = 0
    const start = i * groupSize
    for (let j = 0; j < groupSize; j++) {
      sum += raw[start + j]
    }
    grouped[i] = sum / groupSize
  }
  const out = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const prev = grouped[i - 1] ?? grouped[0]
    const next = grouped[i + 1] ?? grouped[count - 1]
    out[i] = (prev + grouped[i] * 2 + next) / 4
  }
  return out
}

export default function EdgeWaves({ analyserRef, playing }: EdgeWavesProps) {
  const leftRef = useRef<HTMLCanvasElement>(null)
  const rightRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const dataRef = useRef(new Uint8Array(256))

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current)
      return
    }

    const draw = () => {
      const left = leftRef.current
      const right = rightRef.current
      const analyser = analyserRef.current
      if (!left || !right || !analyser) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const ctxL = left.getContext('2d')
      const ctxR = right.getContext('2d')
      if (!ctxL || !ctxR) return

      const w = left.width
      const h = left.height

      analyser.getByteTimeDomainData(dataRef.current)
      const smoothed = smoothData(dataRef.current, 64)

      ctxL.clearRect(0, 0, w, h)
      ctxR.clearRect(0, 0, w, h)

      const mid = 128
      const maxDisp = w * 0.85
      const pointCount = 64

      // Left edge: filled smooth shape from left edge outward
      ctxL.beginPath()
      ctxL.moveTo(0, h)
      for (let i = 0; i < pointCount; i++) {
        const y = (i / (pointCount - 1)) * h
        const amp = ((smoothed[i] - mid) / mid) * maxDisp
        const x = Math.max(0, amp)
        ctxL.lineTo(x, y)
      }
      ctxL.lineTo(0, 0)
      ctxL.closePath()
      ctxL.fillStyle = 'rgba(0, 240, 255, 0.12)'
      ctxL.fill()
      ctxL.strokeStyle = 'rgba(0, 240, 255, 0.5)'
      ctxL.lineWidth = 1.5
      ctxL.shadowColor = 'rgba(0, 240, 255, 0.3)'
      ctxL.shadowBlur = 8
      ctxL.stroke()
      ctxL.shadowBlur = 0

      // Right edge: filled smooth shape from right edge inward
      ctxR.beginPath()
      ctxR.moveTo(w, h)
      for (let i = 0; i < pointCount; i++) {
        const y = (i / (pointCount - 1)) * h
        const amp = ((smoothed[i] - mid) / mid) * maxDisp
        const x = w - Math.max(0, amp)
        ctxR.lineTo(x, y)
      }
      ctxR.lineTo(w, 0)
      ctxR.closePath()
      ctxR.fillStyle = 'rgba(255, 45, 149, 0.12)'
      ctxR.fill()
      ctxR.strokeStyle = 'rgba(255, 45, 149, 0.5)'
      ctxR.lineWidth = 1.5
      ctxR.shadowColor = 'rgba(255, 45, 149, 0.3)'
      ctxR.shadowBlur = 8
      ctxR.stroke()
      ctxR.shadowBlur = 0

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, analyserRef])

  const canvasStyle = {
    position: 'fixed' as const,
    top: 0,
    width: 100,
    height: '100vh',
    zIndex: 1,
    pointerEvents: 'none' as const,
    opacity: playing ? 1 : 0,
    transition: 'opacity 0.4s ease',
  }

  return (
    <>
      <canvas
        ref={leftRef}
        style={{ ...canvasStyle, left: 0 }}
        width={100}
        height={typeof window !== 'undefined' ? window.innerHeight : 900}
      />
      <canvas
        ref={rightRef}
        style={{ ...canvasStyle, right: 0 }}
        width={100}
        height={typeof window !== 'undefined' ? window.innerHeight : 900}
      />
    </>
  )
}
