import type { BpmOption } from '../../song/config/types'

const GAME_MIN = 120
const GAME_MAX = 220

const FACTORS = [
  { factor: 0.5, label: '0.5×' },
  { factor: 0.75, label: '0.75×' },
  { factor: 1, label: 'Original' },
  { factor: 1.25, label: '1.25×' },
  { factor: 1.5, label: '1.5×' },
]

export function generateBpmOptions(rawBpm: number): BpmOption[] {
  const options: BpmOption[] = FACTORS.map(({ factor, label }) => {
    const bpm = Math.round(rawBpm * factor * 10) / 10
    const recommended = bpm >= GAME_MIN && bpm <= GAME_MAX
    const isOriginal = factor === 1

    return { bpm, factor, label, recommended, isOriginal }
  })

  return options
}

export function getRecommendedOption(options: BpmOption[]): BpmOption {
  const recommended = options.find((o) => o.recommended)
  if (recommended) return recommended

  const original = options.find((o) => o.isOriginal)
  if (original) return original

  return options[0]
}

export function getClosestInRange(options: BpmOption[]): BpmOption {
  const inRange = options.filter((o) => o.recommended)
  if (inRange.length === 1) return inRange[0]
  if (inRange.length > 1) {
    return inRange.reduce((a, b) =>
      Math.abs(a.bpm - GAME_MIN) < Math.abs(b.bpm - GAME_MIN) ? a : b,
    )
  }

  // Si ninguno está en rango, elige el más cercano al rango
  const original = options.find((o) => o.isOriginal)!
  const clamped = Math.max(GAME_MIN, Math.min(GAME_MAX, original.bpm))
  return { ...original, bpm: clamped, recommended: false }
}
