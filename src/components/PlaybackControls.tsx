import { Icon } from '@iconify/react'

interface Props {
  playing: boolean
  onTogglePlay: () => void
  volume: number
  onVolumeChange: (value: number) => void
  muted: boolean
  onMuteToggle: () => void
  metronomeVolume: number
  onMetronomeVolumeChange: (value: number) => void
  metronomeEnabled: boolean
  onMetronomeToggle: () => void
}

export default function PlaybackControls({
  playing,
  onTogglePlay,
  volume,
  onVolumeChange,
  muted,
  onMuteToggle,
  metronomeVolume,
  onMetronomeVolumeChange,
  metronomeEnabled,
  onMetronomeToggle,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onTogglePlay}
        className="btn-primary w-full px-10 py-4 text-lg font-bold uppercase tracking-wider"
      >
        <Icon icon={playing ? 'tabler:player-stop-filled' : 'tabler:player-play-filled'} className="w-6 h-6" />
        {playing ? 'Detener' : 'Reproducir'}
      </button>

      <div className="grid grid-cols-[1.5rem_1fr_90px] gap-x-2.5 gap-y-3 items-center">
        <Icon icon="tabler:volume" className="w-5 h-5 text-text-muted justify-self-center" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="range-neon w-full"
        />
        <button
          onClick={onMuteToggle}
          className={`cursor-pointer flex items-center gap-1.5 border px-4 py-2.5 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 justify-center ${
            !muted
              ? 'border-neon-cyan/50 bg-neon-cyan/12 text-neon-cyan hover:bg-neon-cyan/20'
              : 'border-white/10 bg-white/5 text-text-muted hover:border-text-muted/30'
          }`}
        >
          <Icon icon={muted ? 'tabler:music-off' : 'tabler:music'} className="w-5 h-5" />
          Song
        </button>

        <Icon icon="tabler:wave-sine" className="w-5 h-5 text-text-muted justify-self-center" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={metronomeVolume}
          onChange={(e) => onMetronomeVolumeChange(Number(e.target.value))}
          className="range-neon w-full"
        />
        <button
          onClick={onMetronomeToggle}
          className={`cursor-pointer flex items-center gap-1.5 border px-4 py-2.5 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 justify-center ${
            metronomeEnabled
              ? 'border-neon-cyan/50 bg-neon-cyan/12 text-neon-cyan hover:bg-neon-cyan/20'
              : 'border-white/10 bg-white/5 text-text-muted hover:border-text-muted/30'
          }`}
        >
          <Icon icon={metronomeEnabled ? 'tabler:speakerphone' : 'tabler:headphones-off'} className="w-5 h-5" />
          Beat
        </button>
      </div>
    </div>
  )
}
