import type { BpmOption } from '../song/config/types'

interface Props {
  bpmOptions: BpmOption[]
  selectedBpm: number
  onSelect: (bpm: number) => void
}

function pillStyle(opt: BpmOption, selected: boolean): string {
  if (selected) {
    if (opt.isOriginal) return 'border-amber-500/80 bg-amber-500/20 text-amber-300 neon-glow-pink'
    return 'border-neon-pink/70 bg-neon-pink/20 text-neon-pink neon-glow-pink'
  }
  if (opt.isOriginal) return 'border-amber-500/40 bg-amber-500/8 text-amber-400/70 hover:border-amber-500/60 hover:text-amber-400'
  if (opt.recommended) return 'border-neon-cyan/30 bg-neon-cyan/8 text-neon-cyan hover:border-neon-cyan/50 hover:text-neon-cyan'
  return 'border-white/5 bg-black/40 text-text-secondary hover:border-neon-pink/30 hover:text-text-primary'
}

export default function BpmSelector({ bpmOptions, selectedBpm, onSelect }: Props) {
  return (
    <div className="text-left">
      <label className="mb-1.5 block text-base font-semibold uppercase tracking-wider text-neon-cyan">
        Velocidad (BPM)
      </label>
      <div className="flex flex-wrap gap-2">
        {bpmOptions.map((opt) => {
          const selected = selectedBpm === opt.bpm
          return (
            <button
              key={opt.bpm}
              type="button"
              onClick={() => onSelect(opt.bpm)}
              className={`cursor-pointer border px-4 py-2 font-body text-lg font-bold transition-all ${pillStyle(opt, selected)}`}
            >
              <span>{opt.bpm}</span>
              <span className="ml-1.5 text-xs font-normal opacity-70">{opt.label}</span>
              {opt.recommended && <span className="ml-1 text-neon-gold drop-shadow-[0_0_4px_rgba(255,215,0,0.5)]">★</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
