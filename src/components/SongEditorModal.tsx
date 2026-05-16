import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import type { BpmOption } from '../song/config/types'

export interface EditorSnapshot {
  bpm: number
  bpmOptions: BpmOption[]
  offset: number
  title: string
  artist: string
  trimStartMs: number
  trimEndMs: number
}

export interface EditorValues {
  bpm: number
  offset: number
  title: string
  artist: string
  trimStartMs: number
  trimEndMs: number
}

interface SongEditorModalProps {
  audioBuffer: AudioBuffer
  duration: number
  snapshot: EditorSnapshot
  playing: boolean
  currentTimeRef: React.MutableRefObject<number>
  onPlay: () => void
  onStop: () => void
  onSeek: (time: number) => void
  volume: number
  metronomeVolume: number
  metronomeEnabled: boolean
  onVolumeChange: (v: number) => void
  onMetronomeVolumeChange: (v: number) => void
  onMetronomeToggle: () => void
  onApply: (values: EditorValues) => void
  onClose: () => void
}

export default function SongEditorModal({
  audioBuffer, duration, snapshot,
  playing, currentTimeRef,
  onPlay, onStop, onSeek,
  volume, metronomeVolume, metronomeEnabled,
  onVolumeChange, onMetronomeVolumeChange, onMetronomeToggle,
  onApply, onClose,
}: SongEditorModalProps) {
  const durationMs = duration * 1000

  const [localBpm, setLocalBpm] = useState(snapshot.bpm)
  const [localOffset, setLocalOffset] = useState(snapshot.offset)
  const [localTitle, setLocalTitle] = useState(snapshot.title)
  const [localArtist, setLocalArtist] = useState(snapshot.artist)
  const [localTrimStart, setLocalTrimStart] = useState(snapshot.trimStartMs)
  const [localTrimEnd, setLocalTrimEnd] = useState(snapshot.trimEndMs)

  const [closing, setClosing] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const dragging = useRef<'start' | 'end' | null>(null)

  function handleReset() {
    setLocalBpm(snapshot.bpm)
    setLocalOffset(snapshot.offset)
    setLocalTitle(snapshot.title)
    setLocalArtist(snapshot.artist)
    setLocalTrimStart(snapshot.trimStartMs)
    setLocalTrimEnd(snapshot.trimEndMs)
  }

  function handleClose() {
    setClosing(true)
    setTimeout(onClose, 200)
  }

  function handleDone() {
    onApply({
      bpm: localBpm,
      offset: localOffset,
      title: localTitle,
      artist: localArtist,
      trimStartMs: localTrimStart,
      trimEndMs: localTrimEnd,
    })
  }

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    function renderWaveform(cvs: HTMLCanvasElement, width: number) {
      const h = 200
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
        const x = ((currentTimeRef.current) / duration) * w
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.lineWidth = 2
        ctx.shadowColor = 'rgba(255, 255, 255, 0.4)'
        ctx.shadowBlur = 6
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
        ctx.shadowBlur = 0

        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x - 6, 10)
        ctx.lineTo(x + 6, 10)
        ctx.closePath()
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, currentTimeRef, duration])

  const minTrimGap = 50

  const handlePointerDown = useCallback((side: 'start' | 'end') => (e: React.PointerEvent) => {
    e.preventDefault()
    dragging.current = side
    const container = containerRef.current!
    container.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const ms = fraction * durationMs

    if (dragging.current === 'start') {
      setLocalTrimStart(Math.max(0, Math.min(ms, localTrimEnd - minTrimGap)))
    } else {
      setLocalTrimEnd(Math.min(durationMs, Math.max(ms, localTrimStart + minTrimGap)))
    }
  }, [durationMs, localTrimStart, localTrimEnd])

  const handlePointerUp = useCallback(() => {
    dragging.current = null
  }, [])

  function TrimHandle({ side, color }: { side: 'start' | 'end', color: string }) {
    const pos = side === 'start' ? localTrimStart : localTrimEnd
    const isPink = color === 'pink'
    const bgClass = isPink ? 'bg-neon-pink' : 'bg-neon-cyan'
    const lineClass = isPink ? 'bg-neon-pink shadow-[0_0_8px_rgba(255,45,149,0.5)]' : 'bg-neon-cyan shadow-[0_0_8px_rgba(0,240,255,0.5)]'
    const notchShadow = isPink ? 'shadow-[0_0_12px_rgba(255,45,149,0.6)]' : 'shadow-[0_0_12px_rgba(0,240,255,0.6)]'

    return (
      <div
        className="absolute inset-y-0 z-30"
        style={{ left: `${(pos / durationMs) * 100}%` }}
      >
        <div
          className="absolute inset-y-0 -left-[23px] right-[23px] z-30 cursor-ew-resize touch-none"
          onPointerDown={handlePointerDown(side)}
        >
          <div className={`pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 w-7 h-5 rounded-b-md flex items-center justify-center ${notchShadow} ${bgClass}`}>
            <Icon icon="tabler:grip-horizontal" className="w-4 h-3 text-white" />
          </div>
        </div>
        <div className={`pointer-events-none mx-auto w-0.5 h-full ${lineClass}`} />
      </div>
    )
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className={`relative w-full max-w-5xl rounded-xl border border-white/10 bg-[#0a0a1a] p-6 shadow-2xl max-h-[90vh] overflow-y-auto transition-all duration-200 ${closing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 cursor-pointer text-text-muted transition-colors hover:text-white"
          aria-label="Cerrar"
        >
          <Icon icon="tabler:x" className="w-5 h-5" />
        </button>

        <div className="mb-5 flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neon-cyan">Título</label>
            <input
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              className="w-full rounded-lg border border-white/5 bg-black/60 px-3 py-2 text-sm text-text-primary outline-none transition-all focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neon-cyan">Artista</label>
            <input
              type="text"
              value={localArtist}
              onChange={(e) => setLocalArtist(e.target.value)}
              className="w-full rounded-lg border border-white/5 bg-black/60 px-3 py-2 text-sm text-text-primary outline-none transition-all focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30"
            />
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative mb-3 w-full select-none"
          style={{ height: 200 }}
          onClick={(e) => {
            if (dragging.current) return
            const rect = containerRef.current!.getBoundingClientRect()
            const x = (e.clientX - rect.left) / rect.width
            onSeek(x * duration)
          }}
        >
          <canvas
            ref={canvasRef}
            className="pointer-events-none h-full w-full rounded"
            height={200}
            style={{ imageRendering: 'pixelated' }}
          />

          {localTrimStart > 0 && (
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-10 bg-black/60"
              style={{ width: `${(localTrimStart / durationMs) * 100}%` }}
            />
          )}

          {localTrimEnd < durationMs && (
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-10 bg-black/60"
              style={{ width: `${((durationMs - localTrimEnd) / durationMs) * 100}%` }}
            />
          )}

          {playing && (
            <div
              className="pointer-events-none absolute inset-y-0 z-20"
              style={{ left: `${(currentTimeRef.current / duration) * 100}%` }}
            >
              <div className="mx-auto w-0.5 h-full bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.6)]" />
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] text-white">▼</div>
            </div>
          )}

          <TrimHandle side="start" color="pink" />
          <TrimHandle side="end" color="cyan" />
        </div>

        <div className="mb-5 flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-muted">Inicio (ms)</label>
            <input
              type="number"
              value={Math.round(localTrimStart)}
              onChange={(e) => {
                const v = Math.max(0, Math.min(Number(e.target.value), localTrimEnd - minTrimGap))
                setLocalTrimStart(v)
              }}
              className="w-full rounded-lg border border-white/5 bg-black/60 px-3 py-1.5 text-sm text-text-primary outline-none transition-all focus:border-neon-pink/50 focus:ring-1 focus:ring-neon-pink/30"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-muted">Final (ms)</label>
            <input
              type="number"
              value={Math.round(localTrimEnd)}
              onChange={(e) => {
                const v = Math.min(durationMs, Math.max(Number(e.target.value), localTrimStart + minTrimGap))
                setLocalTrimEnd(v)
              }}
              className="w-full rounded-lg border border-white/5 bg-black/60 px-3 py-1.5 text-sm text-text-primary outline-none transition-all focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-neon-cyan">Velocidad (BPM)</label>
          <div className="flex flex-wrap gap-2">
            {snapshot.bpmOptions.map((opt) => {
              const selected = localBpm === opt.bpm
              return (
                <button
                  key={opt.bpm}
                  type="button"
                  onClick={() => setLocalBpm(opt.bpm)}
                  className={`cursor-pointer rounded border px-3 py-1.5 font-disco text-sm font-bold transition-all ${
                    selected
                      ? 'border-neon-pink/60 bg-neon-pink/15 text-neon-pink neon-glow-pink'
                      : 'border-white/5 bg-black/40 text-text-secondary hover:border-neon-pink/30 hover:text-text-primary'
                  }`}
                >
                  {opt.bpm}
                  {opt.recommended && <span className="ml-1 text-neon-gold drop-shadow-[0_0_4px_rgba(255,215,0,0.5)]">★</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neon-cyan">Beat Offset (ms)</label>
          <input
            type="number"
            value={localOffset}
            onChange={(e) => setLocalOffset(Number(e.target.value))}
            className="w-full max-w-[200px] rounded-lg border border-white/5 bg-black/60 px-3 py-1.5 text-sm text-text-primary outline-none transition-all focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30"
          />
        </div>

        <div className="mb-5 flex items-center gap-4">
          <button
            onClick={() => (playing ? onStop() : onPlay())}
            className={`cursor-pointer flex items-center gap-2 rounded-lg border px-5 py-2 font-disco text-sm font-bold uppercase tracking-wider transition-all ${
              playing
                ? 'border-neon-pink/50 bg-neon-pink/12 text-neon-pink hover:bg-neon-pink/20'
                : 'border-neon-cyan/50 bg-neon-cyan/12 text-neon-cyan hover:bg-neon-cyan/20'
            }`}
          >
            <Icon icon={playing ? 'tabler:player-stop-filled' : 'tabler:player-play-filled'} className="w-5 h-5" />
          </button>

          <div className="flex flex-1 items-center gap-2">
            <Icon icon="tabler:volume" className="w-4 h-4 text-text-muted shrink-0" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="range-neon flex-1"
            />
          </div>

          <div className="flex flex-1 items-center gap-2">
            <Icon icon="tabler:wave-sine" className="w-4 h-4 text-text-muted shrink-0" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={metronomeVolume}
              onChange={(e) => onMetronomeVolumeChange(Number(e.target.value))}
              className="range-neon flex-1"
            />
          </div>

          <button
            onClick={onMetronomeToggle}
            className={`cursor-pointer flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
              metronomeEnabled
                ? 'border-neon-cyan/50 bg-neon-cyan/12 text-neon-cyan'
                : 'border-white/10 bg-white/5 text-text-muted'
            }`}
          >
            <Icon icon={metronomeEnabled ? 'tabler:speakerphone' : 'tabler:speakerphone-off'} className="w-4 h-4" />
            Beat
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          <button
            onClick={handleReset}
            className="cursor-pointer flex items-center gap-1.5 rounded border border-white/10 bg-black/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-muted transition-all hover:border-neon-cyan/30 hover:text-neon-cyan"
          >
            <Icon icon="tabler:refresh" className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleDone}
            className="animate-gradient cursor-pointer flex items-center gap-2 rounded bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan px-6 py-2 font-disco text-sm font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:scale-[1.02]"
            style={{ backgroundSize: '200% 200%' }}
          >
            <Icon icon="tabler:check" className="w-5 h-5" />
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
