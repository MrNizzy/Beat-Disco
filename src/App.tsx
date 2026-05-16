import { useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { loadAudioFile } from './audio/loader/index'
import { analyseAudio } from './audio/analyser/index'
import { useAudioPlayer } from './audio/player/useAudioPlayer'
import type { AnalysisResult } from './song/config/types'
import type { AudioFile } from './audio/loader/types'
import { exportSong } from './export/index'
import JSZip from 'jszip'
import { configToJson } from './song/config/index'
import ParticlesBackground from './components/ParticlesBackground'
import EdgeWaves from './components/EdgeWaves'
import BeatPulse from './components/BeatPulse'
import SongWaveform from './components/SongWaveform'
import SongEditorModal from './components/SongEditorModal'
import type { EditorSnapshot } from './components/SongEditorModal'
import { useVolumeStore } from './lib/store/useVolumeStore'

function App() {
  const volume = useVolumeStore((s) => s.volume)
  const metronomeVolume = useVolumeStore((s) => s.metronomeVolume)
  const setVolume = useVolumeStore((s) => s.setVolume)
  const setMetronomeVolume = useVolumeStore((s) => s.setMetronomeVolume)

  const [audioFile, setAudioFile] = useState<AudioFile | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [selectedBpmOption, setSelectedBpmOption] = useState(0)
  const [editableOffset, setEditableOffset] = useState(0)
  const [editableTitle, setEditableTitle] = useState('')
  const [editableArtist, setEditableArtist] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [trimStartMs, setTrimStartMs] = useState(0)
  const [trimEndMs, setTrimEndMs] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false)
  const [snapshot, setSnapshot] = useState<EditorSnapshot | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  const player = useAudioPlayer(
    audioFile?.audioBuffer ?? null,
    selectedBpmOption,
    editableOffset,
    volume,
    metronomeVolume,
    trimStartMs,
    trimEndMs,
  )

  function handleNewSong() {
    player.stop()
    setAudioFile(null)
    setAnalysis(null)
    setSelectedBpmOption(0)
    setEditableOffset(0)
    setEditableTitle('')
    setEditableArtist('')
    setError('')
    setTrimStartMs(0)
    setTrimEndMs(0)
    setEditorOpen(false)
    setSnapshot(null)
  }

  async function handleFile(file: File) {
    player.stop()
    setError('')
    setAnalysis(null)
    setAudioFile(null)

    try {
      setLoading(true)
      const af = await loadAudioFile(file)
      setAudioFile(af)
      setEditableTitle(af.title)
      setEditableArtist(af.artist)

      const result = analyseAudio(af.audioBuffer)
      setAnalysis(result)
      setEditableOffset(result.beatOffset)

      const firstRec = result.bpmOptions.find((o) => o.recommended) ?? result.bpmOptions.find((o) => o.isOriginal)!
      setSelectedBpmOption(firstRec.bpm)

      const durMs = Math.floor(af.audioBuffer.duration * 1000)
      setTrimStartMs(0)
      setTrimEndMs(durMs)
      setSnapshot({
        bpm: firstRec.bpm,
        bpmOptions: result.bpmOptions,
        offset: result.beatOffset,
        title: af.title,
        artist: af.artist,
        trimStartMs: 0,
        trimEndMs: durMs,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar o analizar el audio')
    } finally {
      setLoading(false)
    }
  }

  async function handleExport() {
    if (!audioFile) return
    setExporting(true)
    setError('')

    try {
      const title = editableTitle || audioFile.title || audioFile.fileName.replace(/\.[^.]+$/, '')
      const artist = editableArtist
      const sanitize = (s: string) => s.replace(/[\\/:*?"<>|]/g, '_')
      const folderName = artist ? `${sanitize(title)} - ${sanitize(artist)}` : sanitize(title)
      const songName = title

      const durationMs = audioFile.audioBuffer.duration * 1000
      const result = await exportSong(
        audioFile.audioBuffer,
        {
          tempo: selectedBpmOption,
          beatOffset: editableOffset,
          songName,
          performedBy: artist ? [artist] : [],
          startSongOffset: trimStartMs,
          endSongOffset: Math.max(0, Math.round(durationMs) - trimEndMs),
        },
      )

      const zip = new JSZip()
      const folder = zip.folder(folderName)!
      folder.file('Audio.ogg', result.oggBlob)
      folder.file('Meta.json', configToJson(result.config))

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${folderName}.zip`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar')
    } finally {
      setExporting(false)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current++
    if (e.dataTransfer.types.some((t) => t === 'Files')) {
      setDragOver(true)
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setDragOver(false)
    }
  }

  function handleDropFile(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current = 0
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div
      className="relative min-h-screen"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDropFile}
    >
      <ParticlesBackground playing={player.playing} beatPhaseRef={player.beatPhaseRef} metronomeEnabled={player.metronomeEnabled} />
      <EdgeWaves analyserRef={player.analyserRef} playing={player.playing} />
      <BeatPulse beatPhaseRef={player.beatPhaseRef} playing={player.playing} />

      {dragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-neon-cyan/60 px-12 py-16">
            <Icon icon="tabler:music" className="w-14 h-14 text-neon-cyan drop-shadow-[0_0_20px_rgba(0,240,255,0.6)]" />
            <p className="font-disco text-2xl font-bold uppercase tracking-wider text-neon-cyan drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]">
              Suelta para cargar
            </p>
          </div>
        </div>
      )}

      <main className="relative z-10 mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <header className={`text-center ${audioFile ? 'mb-8' : ''}`}>
          <h1 className="font-disco text-4xl font-bold uppercase tracking-wider text-white sm:text-5xl neon-text">
            Beat Disco
          </h1>
          <p className="mt-2 text-sm text-neon-cyan sm:text-base">
            Audio Toolkit for Dead As Disco
          </p>
        </header>

        {!audioFile ? (
          <div className="flex items-center justify-center min-h-[55vh] sm:min-h-[60vh]">
            <div
              onClick={() => inputRef.current?.click()}
              className="group w-full cursor-pointer rounded-xl border-2 border-dashed border-neon-pink/30 bg-surface/60 p-10 text-center backdrop-blur-sm transition-all duration-300 hover:border-neon-pink/70 hover:bg-surface hover:neon-glow-pink sm:p-14"
            >
              <input
                ref={inputRef}
                type="file"
                accept="audio/*"
                hidden
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <div className="mb-4 text-neon-pink/50 transition-colors group-hover:text-neon-pink/80">
                <Icon icon="tabler:music" className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-cyan border-t-transparent" />
                  <p className="text-sm text-text-secondary">Analizando audio...</p>
                </div>
              ) : (
                <>
                  <p className="text-base font-semibold text-text-primary sm:text-lg">
                    Haz clic o arrastra un archivo de audio
                  </p>
                  <p className="mt-1.5 text-xs text-text-muted">MP3 &middot; WAV &middot; FLAC &middot; OGG &middot; M4A</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex justify-center">
              <button
                onClick={handleNewSong}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-white/5 bg-black/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-secondary transition-all hover:border-neon-cyan/30 hover:text-neon-cyan"
              >
                <Icon icon="tabler:music-plus" className="w-4 h-4" />
                Nueva canción
              </button>
            </div>

            {error && (
              <p className="animate-fade-in rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-400">
                {error}
              </p>
            )}

            {analysis && audioFile && (
              <div className="animate-fade-in rounded-xl border border-white/5 bg-surface/80 p-5 text-center backdrop-blur-sm sm:p-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="font-disco text-lg uppercase tracking-wider text-neon-cyan sm:text-xl">
                      Resultados
                    </h2>
                    <p className="mt-1 text-xs text-text-muted sm:text-sm">
                      {audioFile.audioBuffer.duration.toFixed(1)}s &middot; {audioFile.audioBuffer.sampleRate}Hz &middot;{' '}
                      {audioFile.audioBuffer.numberOfChannels} canales
                    </p>
                  </div>

                  <div className="mx-auto flex max-w-md flex-col gap-4">
                    <div className="text-left">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neon-cyan">
                        Título
                      </label>
                      <input
                        type="text"
                        value={editableTitle}
                        onChange={(e) => setEditableTitle(e.target.value)}
                        className="w-full rounded-lg border border-white/5 bg-black px-3 py-2 text-sm text-text-primary outline-none transition-all focus:border-neon-pink/50 focus:ring-1 focus:ring-neon-pink/30"
                      />
                    </div>
                    <div className="text-left">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neon-cyan">
                        Artista
                      </label>
                      <input
                        type="text"
                        value={editableArtist}
                        onChange={(e) => setEditableArtist(e.target.value)}
                        className="w-full rounded-lg border border-white/5 bg-black px-3 py-2 text-sm text-text-primary outline-none transition-all focus:border-neon-pink/50 focus:ring-1 focus:ring-neon-pink/30"
                      />
                    </div>
                  </div>

                  <div className="mx-auto max-w-md text-left">
                    <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-neon-cyan">
                      Velocidad (BPM)
                    </label>
                    <div className="space-y-2">
                      {analysis.bpmOptions.map((opt) => {
                        const selected = selectedBpmOption === opt.bpm
                        return (
                          <button
                            key={opt.bpm}
                            type="button"
                            onClick={() => {
                              setSelectedBpmOption(opt.bpm)
                              if (player.playing) player.stop()
                            }}
                            className={`cursor-pointer flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200 ${
                              selected
                                ? 'border-neon-pink/60 bg-neon-pink/12 neon-glow-pink'
                                : opt.recommended
                                  ? 'border-neon-gold/30 bg-surface-hover hover:border-neon-gold/50'
                                  : 'border-white/5 bg-surface hover:border-neon-pink/30 hover:bg-surface-hover'
                            }`}
                          >
                            <span className={`min-w-[3.5rem] font-disco text-xl font-bold ${
                              selected ? 'text-neon-pink' : opt.recommended ? 'text-neon-gold' : 'text-text-primary'
                            }`}>
                              {opt.bpm}
                            </span>
                            <span className="text-text-secondary">{opt.label}</span>
                            {opt.recommended && (
                              <span className="ml-auto rounded-full bg-neon-gold/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neon-gold">
                                Recomendado
                              </span>
                            )}
                            {selected && (
                              <span className="ml-2 text-lg text-neon-pink">✓</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mx-auto max-w-md">
                    <SongWaveform
                      audioBuffer={audioFile.audioBuffer}
                      currentTimeRef={player.currentTimeRef}
                      duration={player.duration}
                      playing={player.playing}
                      onSeek={player.seek}
                    />
                  </div>

                  <div className="mx-auto max-w-md">
                    <button
                      onClick={() => setEditorOpen(true)}
                      className="cursor-pointer inline-flex items-center justify-center gap-1.5 w-full rounded-lg border border-white/5 bg-black/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-secondary transition-all hover:border-neon-cyan/30 hover:text-neon-cyan"
                    >
                      <Icon icon="tabler:edit" className="w-4 h-4" />
                      Editar canción
                    </button>
                  </div>

                  <div className="mx-auto max-w-md text-left">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neon-cyan">
                      Beat Offset (ms)
                    </label>
                    <input
                      type="number"
                      value={editableOffset}
                      onChange={(e) => {
                        setEditableOffset(Number(e.target.value))
                        if (player.playing) player.stop()
                      }}
                      className="w-full rounded-lg border border-white/5 bg-black px-3 py-2 text-sm text-text-primary outline-none transition-all focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30"
                    />
                    <p className="mt-1 text-[11px] text-text-muted">
                      El offset no cambia entre opciones de BPM
                    </p>
                  </div>

                  <div className="mx-auto max-w-xs">
                    <button
                      onClick={() => player.playing ? player.stop() : player.play()}
                      className={`w-full cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg border px-6 py-3 font-disco text-base font-bold uppercase tracking-wider transition-all duration-200 ${
                        player.playing
                          ? 'border-neon-pink/50 bg-neon-pink/12 text-neon-pink hover:bg-neon-pink/20'
                          : 'border-neon-cyan/50 bg-neon-cyan/12 text-neon-cyan hover:bg-neon-cyan/20'
                      }`}
                    >
                      <Icon icon={player.playing ? 'tabler:player-stop-filled' : 'tabler:player-play-filled'} className="w-5 h-5" />
                      {player.playing ? 'Detener' : 'Reproducir'}
                    </button>
                  </div>

                  <div className="mx-auto flex max-w-md items-center gap-4">
                    <div className="flex flex-1 items-center gap-2">
                      <Icon icon="tabler:volume" className="w-4 h-4 text-text-muted shrink-0" />
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
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
                        onChange={(e) => setMetronomeVolume(Number(e.target.value))}
                        className="range-neon flex-1"
                      />
                    </div>
                    <button
                      onClick={() => player.setMetronomeEnabled(!player.metronomeEnabled)}
                      className={`cursor-pointer flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                        player.metronomeEnabled
                          ? 'border-neon-cyan/50 bg-neon-cyan/12 text-neon-cyan hover:bg-neon-cyan/20'
                          : 'border-white/10 bg-white/5 text-text-muted hover:border-text-muted/30'
                      }`}
                    >
                      <Icon icon={player.metronomeEnabled ? 'tabler:speakerphone' : 'tabler:speakerphone-off'} className="w-4 h-4" />
                      Beat
                    </button>
                  </div>

                  <div className="mx-auto max-w-xs">
                    <button
                      onClick={handleExport}
                      disabled={exporting}
                      className={`animate-gradient relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan px-6 py-3 font-disco text-base font-bold uppercase tracking-wider text-white shadow-lg transition-all duration-300 inline-flex items-center justify-center gap-2 ${
                        exporting
                          ? 'cursor-not-allowed opacity-50'
                          : 'cursor-pointer hover:scale-[1.02] hover:shadow-neon-pink/30'
                      }`}
                    >
                      <Icon icon={exporting ? 'tabler:loader-2' : 'tabler:download'} className={`w-5 h-5 ${exporting ? 'animate-spin' : ''}`} />
                      <span className="relative z-10">
                        {exporting ? 'Generando ZIP...' : 'Exportar ZIP'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {editorOpen && snapshot && audioFile && (
          <SongEditorModal
            audioBuffer={audioFile.audioBuffer}
            duration={player.duration}
            snapshot={snapshot}
            playing={player.playing}
            currentTimeRef={player.currentTimeRef}
            onPlay={() => player.play()}
            onStop={() => player.stop()}
            onSeek={player.seek}
            volume={volume}
            metronomeVolume={metronomeVolume}
            metronomeEnabled={player.metronomeEnabled}
            onVolumeChange={setVolume}
            onMetronomeVolumeChange={setMetronomeVolume}
            onMetronomeToggle={() => player.setMetronomeEnabled(!player.metronomeEnabled)}
            onApply={(values) => {
              setSelectedBpmOption(values.bpm)
              setEditableOffset(values.offset)
              setEditableTitle(values.title)
              setEditableArtist(values.artist)
              setTrimStartMs(values.trimStartMs)
              setTrimEndMs(values.trimEndMs)
              setEditorOpen(false)
            }}
            onClose={() => setEditorOpen(false)}
          />
        )}

        <footer className="mt-12 text-center text-[11px] text-text-muted">
          {audioFile && (
            <p className="mb-1 truncate px-2">
              {audioFile.fileName}
            </p>
          )}
          <p>Hecho para Dead As Disco</p>
        </footer>
      </main>
    </div>
  )
}

export default App
