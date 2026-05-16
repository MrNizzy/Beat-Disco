import { useRef, useState } from 'react'
import { loadAudioFile } from './audio/loader/index'
import { analyseAudio } from './audio/analyser/index'
import { useAudioPlayer } from './audio/player/useAudioPlayer'
import type { AnalysisResult } from './song/config/types'
import type { AudioFile } from './audio/loader/types'
import { exportSong } from './export/index'
import JSZip from 'jszip'
import { configToJson } from './song/config/index'
import BackgroundLayers from './components/BackgroundLayers'
import DragOverlay from './components/DragOverlay'
import DropZone from './components/DropZone'
import SongWaveform from './components/SongWaveform'
import SongMetadataForm from './components/SongMetadataForm'
import BpmSelector from './components/BpmSelector'
import PlaybackControls from './components/PlaybackControls'
import ActionButtons from './components/ActionButtons'
import SongEditorModal from './components/SongEditorModal'
import type { EditorSnapshot } from './components/SongEditorModal'
import BorderGlow from './components/BorderGlow'
import TargetCursor from './components/TargetCursor'
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

  function handleBpmSelect(bpm: number) {
    setSelectedBpmOption(bpm)
    if (player.playing) player.stop()
  }

  return (
    <div
      className="relative min-h-screen"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDropFile}
    >
      <BackgroundLayers
        playing={player.playing}
        beatPhaseRef={player.beatPhaseRef}
        metronomeEnabled={player.metronomeEnabled}
        analyserRef={player.analyserRef}
      />

      <DragOverlay visible={dragOver} />

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <main className="relative z-10 mx-auto max-w-[90dvw] px-4 py-8 sm:px-6 sm:py-12">
        <header className={`text-center ${audioFile ? 'mb-8' : ''}`}>
          <h1 onClick={goHome} className="cursor-target font-disco text-5xl font-bold uppercase tracking-wider text-white sm:text-7xl neon-text cursor-pointer select-none" style={{ fontFamily: 'XXIX, sans-serif' }}>
            Beat Disco
          </h1>
          <p className="mt-2 text-base text-neon-cyan sm:text-lg">
            Audio Toolkit for Dead As Disco
          </p>
        </header>

        {!audioFile ? (
          <DropZone
            loading={loading}
            onClick={() => inputRef.current?.click()}
          />
        ) : (
          <section className="flex flex-col gap-4">
            {error && (
              <p className="animate-fade-in  bg-red-900/30 px-4 py-3 text-base text-red-400">
                {error}
              </p>
            )}

            {analysis && audioFile && (
              <BorderGlow
                colors={['#ff2d95', '#00f0ff', '#b300ff']}
                glowColor="330 100 60"
                backgroundColor="rgba(17,17,34,0.9)"
                borderRadius={0}
                edgeSensitivity={30}
                animated={true}
                glowIntensity={1.0}
                fillOpacity={0.5}
              >
              <article className="animate-fade-in overflow-hidden">
                <div className="p-8 sm:p-10 space-y-7">
                  <SongMetadataForm
                    title={editableTitle}
                    artist={editableArtist}
                    onChangeTitle={setEditableTitle}
                    onChangeArtist={setEditableArtist}
                    duration={audioFile.audioBuffer.duration}
                    sampleRate={audioFile.audioBuffer.sampleRate}
                    channels={audioFile.audioBuffer.numberOfChannels}
                  />

                  <SongWaveform
                    audioBuffer={audioFile.audioBuffer}
                    currentTimeRef={player.currentTimeRef}
                    duration={player.duration}
                    playing={player.playing}
                    onSeek={player.seek}
                  />

                  <div className="grid md:grid-cols-2 gap-6">
                    <BpmSelector
                      bpmOptions={analysis.bpmOptions}
                      selectedBpm={selectedBpmOption}
                      onSelect={handleBpmSelect}
                    />

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
                        className="cursor-target w-full  border border-white/5 bg-black px-5 py-3.5 text-lg text-text-primary outline-none transition-all focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30"
                      />
                      <p className="mt-1 text-sm text-text-muted">
                        El offset no cambia entre opciones de BPM
                      </p>
                    </div>
                  </div>

                  <PlaybackControls
                    playing={player.playing}
                    onTogglePlay={() => player.playing ? player.stop() : player.play()}
                    volume={volume}
                    onVolumeChange={setVolume}
                    muted={muted}
                    onMuteToggle={() => setMuted(!muted)}
                    metronomeVolume={metronomeVolume}
                    onMetronomeVolumeChange={setMetronomeVolume}
                    metronomeEnabled={player.metronomeEnabled}
                    onMetronomeToggle={() => player.setMetronomeEnabled(!player.metronomeEnabled)}
                  />

                  <ActionButtons
                    onNewSong={handleNewSong}
                    onEdit={() => setEditorOpen(true)}
                    onExport={handleExport}
                    exporting={exporting}
                  />
                </div>
              </article>
              </BorderGlow>
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

      <TargetCursor />
    </div>
  )
}

export default App
