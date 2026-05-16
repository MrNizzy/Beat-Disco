import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface VolumeStore {
  volume: number
  metronomeVolume: number
  setVolume: (v: number) => void
  setMetronomeVolume: (v: number) => void
}

export const useVolumeStore = create<VolumeStore>()(
  persist(
    (set) => ({
      volume: 1.0,
      metronomeVolume: 0.3,
      setVolume: (volume) => set({ volume }),
      setMetronomeVolume: (metronomeVolume) => set({ metronomeVolume }),
    }),
    { name: 'beat-disco-volume' },
  ),
)
