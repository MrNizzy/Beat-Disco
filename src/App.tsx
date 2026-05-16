import { useRef, useState } from 'react'
import { loadAudioFile } from './audio/loader/index'
import { analyseAudio } from './audio/analyser/index'
import type { AnalysisResult } from './song/config/types'
import type { AudioFile } from './audio/loader/types'
import { exportSong } from './export/index'
import JSZip from 'jszip'
import { configToJson } from './song/config/index'

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
      const folderName = artist ? `${title} - ${artist}` : title
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
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Beat Disco</h1>
      <p style={{ color: '#666' }}>Audio toolkit for Dead As Disco</p>

      <div
        onClick={() => inputRef.current?.click()}
        style={{
          border: '2px dashed #ccc',
          borderRadius: 8,
          padding: 48,
          textAlign: 'center',
          cursor: 'pointer',
          marginTop: 24,
          background: '#fafafa',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {loading ? <p>Analizando audio...</p> : <p>Haz clic para cargar un archivo de audio</p>}
        <p style={{ fontSize: 12, color: '#999' }}>MP3, WAV, FLAC, OGG, M4A</p>
      </div>

      {error && <p style={{ color: '#d32f2f', marginTop: 16 }}>{error}</p>}

      {analysis && audioFile && (
        <div style={{ marginTop: 24 }}>
          <h2>Resultados</h2>

          <div style={{ marginTop: 12, fontSize: 14, color: '#666' }}>
            <p>Duración: {audioFile.audioBuffer.duration.toFixed(1)}s &middot; {audioFile.audioBuffer.sampleRate}Hz &middot; {audioFile.audioBuffer.numberOfChannels} canales</p>
          </div>

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Título</label>
              <input
                type="text"
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                style={{ width: '100%', padding: 8, fontSize: 14, border: '1px solid #ccc', borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Artista</label>
              <input
                type="text"
                value={editableArtist}
                onChange={(e) => setEditableArtist(e.target.value)}
                style={{ width: '100%', padding: 8, fontSize: 14, border: '1px solid #ccc', borderRadius: 4 }}
              />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 8 }}>Velocidad (BPM)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {analysis.bpmOptions.map((opt) => {
                const selected = selectedBpmOption === opt.bpm
                return (
                  <button
                    key={opt.bpm}
                    type="button"
                    onClick={() => setSelectedBpmOption(opt.bpm)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      border: `2px solid ${selected ? '#1976d2' : opt.recommended ? '#e3f2fd' : '#e0e0e0'}`,
                      borderRadius: 8,
                      background: selected ? '#e3f2fd' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 14,
                      width: '100%',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 18, minWidth: 56 }}>{opt.bpm}</span>
                    <span style={{ color: '#666' }}>{opt.label}</span>
                    {opt.recommended && (
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: 11,
                        background: '#1976d2',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontWeight: 600,
                      }}>
                        RECOMENDADO
                      </span>
                    )}
                    {selected && (
                      <span style={{ marginLeft: 'auto', fontSize: 18 }}>✓</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Beat Offset (ms)</label>
            <input
              type="number"
              value={editableOffset}
              onChange={(e) => setEditableOffset(Number(e.target.value))}
              style={{ width: '100%', padding: 8, fontSize: 16, border: '1px solid #ccc', borderRadius: 4 }}
            />
            <p style={{ fontSize: 11, color: '#999', marginTop: 2 }}>El offset no cambia entre opciones de BPM</p>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              marginTop: 24,
              padding: '12px 32px',
              fontSize: 16,
              background: exporting ? '#ccc' : '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: exporting ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            {exporting ? 'Generando ZIP...' : 'Exportar ZIP'}
          </button>
        </div>
      )}
    </main>
  )
}

export default App
