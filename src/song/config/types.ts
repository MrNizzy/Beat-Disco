export interface SongConfig {
  version: number
  uniqueId: number
  songName: string
  performedBy: string[]
  writtenBy: string[]
  seed: number
  tempo: number
  customTempoSections: TempoSection[]
  beatOffset: number
  startSongOffset: number
  endSongOffset: number
}

export interface TempoSection {
  startBeat: number
  endBeat: number
  tempo: number
}

export interface BpmOption {
  bpm: number
  factor: number
  label: string
  recommended: boolean
  isOriginal: boolean
}

export interface AnalysisResult {
  bpm: number
  beatOffset: number
  confidence: number
  beats: number[]
  bpmOptions: BpmOption[]
}

export interface ExportResult {
  oggBlob: Blob
  config: SongConfig
}
