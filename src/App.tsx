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
import BorderGlow from './components/BorderGlow'
import LiquidEther from './components/LiquidEther'
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
  const [muted, setMuted] = useState(false)
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
    muted ? 0 : volume,
    metronomeVolume,
    trimStartMs,
    trimEndMs,
  )

  function goHome() {
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

  function handleNewSong() {
    goHome()
    inputRef.current?.click()
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
      <div className="fixed inset-0 z-[-1] pointer-events-none" aria-hidden="true">
        <LiquidEther
          colors={['#ff2d95', '#00f0ff', '#b300ff']}
          mouseForce={20}
          cursorSize={100}
          resolution={0.5}
          autoDemo={true}
          autoSpeed={0.5}
          autoIntensity={2.2}
        />
      </div>

      {dragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4  border-2 border-dashed border-neon-cyan/60 px-12 py-16">
            <Icon icon="tabler:music" className="w-14 h-14 text-neon-cyan drop-shadow-[0_0_20px_rgba(0,240,255,0.6)]" />
            <p className="font-body text-2xl font-bold uppercase tracking-wider text-neon-cyan drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]">
              Suelta para cargar
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <main className="relative z-10 mx-auto max-w-[90dvw] px-4 py-8 sm:px-6 sm:py-12">
        <header className={`text-center ${audioFile ? 'mb-8' : ''}`}>
          <h1 onClick={goHome} className="font-disco text-5xl font-bold uppercase tracking-wider text-white sm:text-7xl neon-text cursor-pointer select-none" style={{ fontFamily: 'XXIX, sans-serif' }}>
            Beat Disco
          </h1>
          <p className="mt-2 text-base text-neon-cyan sm:text-lg">
            Audio Toolkit for Dead As Disco
          </p>
        </header>

        {!audioFile ? (
          <section className="flex items-center justify-center min-h-[55vh] sm:min-h-[60vh]">
            <div
              onClick={() => inputRef.current?.click()}
              className="group w-full cursor-pointer  border-2 border-dashed border-neon-pink/30 bg-surface/60 p-12 text-center backdrop-blur-sm transition-all duration-300 hover:border-neon-pink/70 hover:bg-surface hover:neon-glow-pink sm:p-16"
            >
              <div className="mb-4 flex justify-center text-neon-pink/50 transition-colors group-hover:text-neon-pink/80">
                <Icon icon="tabler:music" className="w-14 h-14 sm:w-16 sm:h-16" />
              </div>
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-neon-cyan border-t-transparent" />
                  <p className="text-base text-text-secondary">Analizando audio...</p>
                </div>
              ) : (
                <>
                  <p className="text-base font-semibold text-text-primary sm:text-lg">
                    Haz clic o arrastra un archivo de audio
                  </p>
                  <p className="mt-3 text-sm text-text-muted"><span className="text-neon-pink">•</span> MP3  <span className="text-neon-pink">•</span> WAV  <span className="text-neon-pink">•</span> FLAC  <span className="text-neon-pink">•</span> OGG  <span className="text-neon-pink">•</span> M4A</p>
                </>
              )}
            </div>
          </section>
        ) : (
          <section className="flex flex-col gap-4">
            <div className="flex justify-center">
              <BorderGlow
                colors={['#00f0ff', '#ff2d95', '#b300ff']}
                glowColor="190 100 50"
                backgroundColor="#050505"
                borderRadius={0}
                edgeSensitivity={30}
                animated={true}
                glowIntensity={1.0}
                fillOpacity={0.5}
              >
                <button
                  onClick={handleNewSong}
                  className="cursor-pointer inline-flex items-center gap-1.5  border border-white/5 bg-black/40 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-text-secondary transition-all hover:border-neon-cyan/30 hover:text-neon-cyan"
                >
                  <Icon icon="tabler:music-plus" className="w-5 h-5" />
                  Nueva canción
                </button>
              </BorderGlow>
            </div>

            {error && (
              <p className="animate-fade-in  bg-red-900/30 px-4 py-3 text-base text-red-400">
                {error}
              </p>
            )}

            {analysis && audioFile && (
              <article className="animate-fade-in  border border-white/5 bg-surface/80 backdrop-blur-sm overflow-hidden">
                <div className="h-[3px] bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan" />
                <div className="p-8 sm:p-10 space-y-6">
                  <div>
                    <div className="flex gap-3">
                      <div className="flex-1 text-left">
                        <label className="mb-1.5 block text-base font-semibold uppercase tracking-wider text-neon-cyan">
                          Título
                        </label>
                        <input
                          type="text"
                          value={editableTitle}
                          onChange={(e) => setEditableTitle(e.target.value)}
                          className="w-full  border border-white/5 bg-black px-5 py-3.5 text-lg text-text-primary outline-none transition-all focus:border-neon-pink/50 focus:ring-1 focus:ring-neon-pink/30"
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <label className="mb-1.5 block text-base font-semibold uppercase tracking-wider text-neon-cyan">
                          Artista
                        </label>
                        <input
                          type="text"
                          value={editableArtist}
                          onChange={(e) => setEditableArtist(e.target.value)}
                          className="w-full  border border-white/5 bg-black px-5 py-3.5 text-lg text-text-primary outline-none transition-all focus:border-neon-pink/50 focus:ring-1 focus:ring-neon-pink/30"
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-text-muted">
                      {audioFile.audioBuffer.duration.toFixed(1)}s &middot; {audioFile.audioBuffer.sampleRate}Hz &middot;{' '}
                      {audioFile.audioBuffer.numberOfChannels} canales
                    </p>
                  </div>

                  <div className="md:grid md:grid-cols-2 md:gap-6">
                    <section className="space-y-5">
                      <SongWaveform
                        audioBuffer={audioFile.audioBuffer}
                        currentTimeRef={player.currentTimeRef}
                        duration={player.duration}
                        playing={player.playing}
                        onSeek={player.seek}
                      />

                      <div className="text-left">
                        <label className="mb-1.5 block text-base font-semibold uppercase tracking-wider text-neon-cyan">
                          Velocidad (BPM)
                        </label>
                        <div className="flex flex-wrap gap-2">
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
                                className={`cursor-pointer  border px-5 py-2.5 font-body text-lg font-bold transition-all ${
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
                    </section>

                    <aside className="space-y-5 mt-6 md:mt-0 bg-black/30 p-6">
                      <div className="text-left">
                        <label className="mb-1.5 block text-base font-semibold uppercase tracking-wider text-neon-cyan">
                          Beat Offset (ms)
                        </label>
                        <input
                          type="number"
                          value={editableOffset}
                          onChange={(e) => {
                            setEditableOffset(Number(e.target.value))
                            if (player.playing) player.stop()
                          }}
                          className="w-full  border border-white/5 bg-black px-5 py-3.5 text-lg text-text-primary outline-none transition-all focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30"
                        />
                        <p className="mt-1 text-sm text-text-muted">
                          El offset no cambia entre opciones de BPM
                        </p>
                      </div>

                      <BorderGlow
                        colors={['#ff2d95', '#00f0ff', '#b300ff']}
                        glowColor="330 100 60"
                        backgroundColor="#050505"
                        borderRadius={0}
                        edgeSensitivity={30}
                        animated={true}
                        glowIntensity={1.0}
                        fillOpacity={0.5}
                      >
                        <button
                          onClick={() => player.playing ? player.stop() : player.play()}
                          className="btn-primary w-full  px-10 py-4 text-lg font-bold uppercase tracking-wider"
                        >
                          <Icon icon={player.playing ? 'tabler:player-stop-filled' : 'tabler:player-play-filled'} className="w-6 h-6" />
                          {player.playing ? 'Detener' : 'Reproducir'}
                        </button>
                      </BorderGlow>

                      <div className="grid grid-cols-[1.5rem_1fr_90px] gap-x-2.5 gap-y-3 items-center">
                        <Icon icon="tabler:volume" className="w-5 h-5 text-text-muted justify-self-center" />
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={volume}
                          onChange={(e) => setVolume(Number(e.target.value))}
                          className="range-neon w-full"
                        />
                        <button
                          onClick={() => player.setMetronomeEnabled(!player.metronomeEnabled)}
                          className={`cursor-pointer flex items-center gap-1.5 border px-4 py-2.5 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 justify-center ${
                            player.metronomeEnabled
                              ? 'border-neon-cyan/50 bg-neon-cyan/12 text-neon-cyan hover:bg-neon-cyan/20'
                              : 'border-white/10 bg-white/5 text-text-muted hover:border-text-muted/30'
                          }`}
                        >
                          <Icon icon={player.metronomeEnabled ? 'tabler:speakerphone' : 'tabler:headphones-off'} className="w-5 h-5" />
                          Beat
                        </button>

                        <Icon icon="tabler:wave-sine" className="w-5 h-5 text-text-muted justify-self-center" />
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={metronomeVolume}
                          onChange={(e) => setMetronomeVolume(Number(e.target.value))}
                          className="range-neon w-full"
                        />
                        <button
                          onClick={() => setMuted(!muted)}
                          className={`cursor-pointer flex items-center gap-1.5 border px-4 py-2.5 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 justify-center ${
                            !muted
                              ? 'border-neon-cyan/50 bg-neon-cyan/12 text-neon-cyan hover:bg-neon-cyan/20'
                              : 'border-white/10 bg-white/5 text-text-muted hover:border-text-muted/30'
                          }`}
                        >
                          <Icon icon={muted ? 'tabler:music-off' : 'tabler:music'} className="w-5 h-5" />
                          Song
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditorOpen(true)}
                          className="cursor-pointer inline-flex items-center justify-center gap-1.5 flex-1  border border-white/5 bg-black/40 px-6 py-3 text-base font-bold uppercase tracking-wider text-text-secondary transition-all hover:border-neon-cyan/30 hover:text-neon-cyan"
                        >
                          <Icon icon="tabler:edit" className="w-5 h-5" />
                          Editar
                        </button>
                        <BorderGlow
                          colors={['#ff2d95', '#00f0ff', '#b300ff']}
                          glowColor="190 100 50"
                          backgroundColor="#050505"
                          borderRadius={0}
                          edgeSensitivity={30}
                          animated={true}
                          glowIntensity={1.0}
                          fillOpacity={0.5}
                        >
                          <button
                            onClick={handleExport}
                            disabled={exporting}
                            className={`-rotate-1 flex-1 bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan text-white px-10 py-3 text-base font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 ${
                            exporting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                          }`}
                        >
                          <Icon icon={exporting ? 'tabler:loader-2' : 'tabler:download'} className={`w-5 h-5 ${exporting ? 'animate-spin' : ''}`} />
                          <span>
                            {exporting ? 'Generando ZIP...' : 'Exportar ZIP'}
                          </span>
                        </button>
                        </BorderGlow>
                      </div>
                    </aside>
                  </div>
                </div>
              </article>
            )}
          </section>
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
            muted={muted}
            onVolumeChange={setVolume}
            onMetronomeVolumeChange={setMetronomeVolume}
            onMetronomeToggle={() => player.setMetronomeEnabled(!player.metronomeEnabled)}
            onMuteToggle={() => setMuted(!muted)}
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

        <footer className="mt-12 text-center text-sm text-text-muted">
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
