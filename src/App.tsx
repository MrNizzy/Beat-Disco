import { useRef, useState } from 'react'
import { loadAudioFile } from './audio/loader/index'
import { analyseAudio } from './audio/analyser/index'
import type { AnalysisResult } from './song/config/types'
import type { AudioFile } from './audio/loader/types'
import { exportSong } from './export/index'
import JSZip from 'jszip'
import { configToJson } from './song/config/index'
import ParticlesBackground from './components/ParticlesBackground'

function MusicNote() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 sm:w-12 sm:h-12">
      <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}

function App() {
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [selectedBpmOption, setSelectedBpmOption] = useState(0)
  const [editableOffset, setEditableOffset] = useState(0)
  const [editableTitle, setEditableTitle] = useState('')
  const [editableArtist, setEditableArtist] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
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

      const result = await exportSong(
        audioFile.audioBuffer,
        { tempo: selectedBpmOption, beatOffset: editableOffset, songName, performedBy: artist ? [artist] : [] },
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

  return (
    <div className="relative min-h-screen">
      <ParticlesBackground />
      <main className="relative z-10 mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 text-center">
          <h1 className="font-disco text-4xl font-bold uppercase tracking-wider text-white sm:text-5xl neon-text">
            Beat Disco
          </h1>
          <p className="mt-2 text-sm text-neon-cyan sm:text-base">
            Audio Toolkit for Dead As Disco
          </p>
        </header>

        <div
          onClick={() => inputRef.current?.click()}
          className="group cursor-pointer rounded-xl border-2 border-dashed border-neon-pink/30 bg-surface/60 p-10 text-center backdrop-blur-sm transition-all duration-300 hover:border-neon-pink/70 hover:bg-surface hover:neon-glow-pink sm:p-14"
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            hidden
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="mb-3 text-neon-pink/50 transition-colors group-hover:text-neon-pink/80">
            <MusicNote />
          </div>
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-neon-cyan border-t-transparent" />
              <p className="text-sm text-text-secondary">Analizando audio...</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-text-primary sm:text-base">
                Haz clic para cargar un archivo de audio
              </p>
              <p className="mt-1 text-xs text-text-muted">MP3 &middot; WAV &middot; FLAC &middot; OGG &middot; M4A</p>
            </>
          )}
        </div>

        {error && (
          <p className="mt-4 animate-fade-in rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {analysis && audioFile && (
          <div className="mt-8 animate-fade-in space-y-6 rounded-xl border border-white/5 bg-surface/80 p-5 text-center backdrop-blur-sm sm:p-6">
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
                      onClick={() => setSelectedBpmOption(opt.bpm)}
                      className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200 ${
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

            <div className="mx-auto max-w-md text-left">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neon-cyan">
                Beat Offset (ms)
              </label>
              <input
                type="number"
                value={editableOffset}
                onChange={(e) => setEditableOffset(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/5 bg-black px-3 py-2 text-sm text-text-primary outline-none transition-all focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30"
              />
              <p className="mt-1 text-[11px] text-text-muted">
                El offset no cambia entre opciones de BPM
              </p>
            </div>

            <div className="mx-auto max-w-xs">
              <button
                onClick={handleExport}
                disabled={exporting}
                className={`animate-gradient relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan px-6 py-3 font-disco text-base font-bold uppercase tracking-wider text-white shadow-lg transition-all duration-300 ${
                  exporting
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer hover:scale-[1.02] hover:shadow-neon-pink/30'
                }`}
              >
                <span className="relative z-10">
                  {exporting ? 'Generando ZIP...' : 'Exportar ZIP'}
                </span>
              </button>
            </div>
          </div>
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
