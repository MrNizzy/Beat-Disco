import { useCallback, useEffect, useRef, useState } from 'react'

export interface AudioPlayerAPI {
  playing: boolean
  play: () => void
  stop: () => void
  seek: (time: number) => void
  metronomeEnabled: boolean
  setMetronomeEnabled: (v: boolean) => void
  analyserRef: React.MutableRefObject<AnalyserNode | null>
  beatPhaseRef: React.MutableRefObject<number>
  currentTimeRef: React.MutableRefObject<number>
  duration: number
  volume: number
  metronomeVolume: number
}

function playMetronomeClick(ctx: AudioContext, gainNode: GainNode, beatNum: number) {
  const isAccent = beatNum % 4 === 0
  const osc = ctx.createOscillator()
  const clickGain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = isAccent ? 660 : 440
  const now = ctx.currentTime
  clickGain.gain.setValueAtTime(isAccent ? 0.45 : 0.3, now)
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + (isAccent ? 0.06 : 0.04))
  osc.connect(clickGain)
  clickGain.connect(gainNode)
  osc.start(now)
  osc.stop(now + (isAccent ? 0.08 : 0.06))
}

export function useAudioPlayer(
  audioBuffer: AudioBuffer | null,
  bpm: number,
  offsetMs: number,
  volume: number,
  metronomeVolume: number,
  trimStartMs = 0,
  trimEndMs = 0,
): AudioPlayerAPI {
  const [playing, setPlaying] = useState(false)
  const [metronomeEnabled, setMetronomeEnabledState] = useState(true)

  const ctxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const metronomeGainRef = useRef<GainNode | null>(null)
  const rafRef = useRef(0)
  const startTimeRef = useRef(0)
  const playbackOffsetRef = useRef(0)
  const beatPhaseRef = useRef(0)
  const currentTimeRef = useRef(0)
  const lastBeatIndexRef = useRef(-1)
  const beatCountRef = useRef(0)
  const cleanupRef = useRef(false)
  const volumeRef = useRef(volume)
  const metronomeVolumeRef = useRef(metronomeVolume)
  const metronomeEnabledRef = useRef(true)
  const trimStartRef = useRef(trimStartMs)
  const trimEndRef = useRef(trimEndMs)

  const beatInterval = 60000 / bpm

  useEffect(() => {
    volumeRef.current = volume
    if (gainRef.current) {
      gainRef.current.gain.value = volume
    }
  }, [volume])

  useEffect(() => {
    metronomeVolumeRef.current = metronomeVolume
    if (metronomeGainRef.current) {
      metronomeGainRef.current.gain.value = metronomeVolume
    }
  }, [metronomeVolume])

  useEffect(() => {
    const changed = trimStartRef.current !== trimStartMs || trimEndRef.current !== trimEndMs
    trimStartRef.current = trimStartMs
    trimEndRef.current = trimEndMs
    if (playing && audioBuffer && changed) {
      const ct = currentTimeRef.current
      const ts = trimStartMs / 1000
      const te = trimEndMs > 0 ? trimEndMs / 1000 : audioBuffer.duration
      const restartPos = Math.min(Math.max(ct, ts), te - 0.01)
      start(restartPos)
    }
  }, [trimStartMs, trimEndMs])

  const cleanup = useCallback(() => {
    cleanupRef.current = true
    cancelAnimationFrame(rafRef.current)

    try { sourceRef.current?.stop() } catch {}
    try { sourceRef.current?.disconnect() } catch {}
    try { analyserRef.current?.disconnect() } catch {}
    try { gainRef.current?.disconnect() } catch {}
    try { metronomeGainRef.current?.disconnect() } catch {}
    try { ctxRef.current?.close() } catch {}

    sourceRef.current = null
    analyserRef.current = null
    gainRef.current = null
    metronomeGainRef.current = null
    ctxRef.current = null
    setPlaying(false)
    beatPhaseRef.current = 0
  }, [])

  const start = useCallback((songPos: number) => {
    if (!audioBuffer) return
    cleanup()

    const ctx = new AudioContext()
    const source = ctx.createBufferSource()
    const analyser = ctx.createAnalyser()
    const gain = ctx.createGain()
    const metronomeGain = ctx.createGain()

    analyser.fftSize = 512
    source.buffer = audioBuffer
    source.loop = true

    const trimStartSec = trimStartRef.current / 1000
    const trimEndSec = trimEndRef.current > 0
      ? Math.min(trimEndRef.current / 1000, audioBuffer.duration)
      : audioBuffer.duration
    source.loopStart = trimStartSec
    source.loopEnd = trimEndSec

    source.connect(analyser)
    analyser.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.value = volumeRef.current
    metronomeGain.gain.value = metronomeVolumeRef.current
    metronomeGain.connect(ctx.destination)

    const clampPos = Math.max(trimStartSec, Math.min(songPos, trimEndSec - 0.01))
    source.start(0, clampPos)

    ctxRef.current = ctx
    sourceRef.current = source
    analyserRef.current = analyser
    gainRef.current = gain
    metronomeGainRef.current = metronomeGain
    startTimeRef.current = ctx.currentTime
    playbackOffsetRef.current = clampPos
    currentTimeRef.current = clampPos
    cleanupRef.current = false

    const offsetSec = offsetMs / 1000
    const timeSinceFirstBeat = clampPos - offsetSec
    lastBeatIndexRef.current = Math.floor(timeSinceFirstBeat / (beatInterval / 1000))
    beatCountRef.current = Math.floor(timeSinceFirstBeat / (beatInterval / 1000))

    setPlaying(true)

    const tick = () => {
      if (cleanupRef.current) return
      if (!ctxRef.current || !analyserRef.current) return

      const elapsed = ctxRef.current.currentTime - startTimeRef.current
      const trimStartSec = trimStartRef.current / 1000
      const trimEndSec = trimEndRef.current > 0
        ? Math.min(trimEndRef.current / 1000, audioBuffer.duration)
        : audioBuffer.duration
      const loopDuration = trimEndSec - trimStartSec
      const elapsedInLoop = (elapsed + (playbackOffsetRef.current - trimStartSec)) % loopDuration
      const currentTime = trimStartSec + (elapsedInLoop < 0 ? elapsedInLoop + loopDuration : elapsedInLoop)
      currentTimeRef.current = currentTime

      const offsetSec = offsetMs / 1000
      const timeSinceFirstBeat = currentTime - offsetSec
      const rawPhase = (timeSinceFirstBeat % (beatInterval / 1000)) / (beatInterval / 1000)
      beatPhaseRef.current = rawPhase < 0 ? rawPhase + 1 : rawPhase

      const currentBeatIndex = Math.floor(timeSinceFirstBeat / (beatInterval / 1000))
      if (currentBeatIndex > lastBeatIndexRef.current) {
        lastBeatIndexRef.current = currentBeatIndex
        beatCountRef.current++
        if (metronomeEnabledRef.current) {
          playMetronomeClick(ctxRef.current!, metronomeGainRef.current!, beatCountRef.current)
        }
      } else if (currentBeatIndex < lastBeatIndexRef.current - 1) {
        lastBeatIndexRef.current = currentBeatIndex
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [audioBuffer, bpm, offsetMs, beatInterval, cleanup])

  const play = useCallback(() => {
    start(offsetMs / 1000)
  }, [start, offsetMs])

  const seek = useCallback((time: number) => {
    start(time)
  }, [start])

  const stop = useCallback(() => {
    cleanup()
  }, [cleanup])

  const setMetronomeEnabled = useCallback((v: boolean) => {
    metronomeEnabledRef.current = v
    setMetronomeEnabledState(v)
  }, [])

  useEffect(() => {
    return () => { cleanup() }
  }, [cleanup])

  return {
    playing,
    play,
    stop,
    seek,
    metronomeEnabled,
    setMetronomeEnabled,
    analyserRef,
    beatPhaseRef,
    currentTimeRef,
    duration: audioBuffer?.duration ?? 0,
    volume,
    metronomeVolume,
  }
}
