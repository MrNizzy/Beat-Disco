interface Props {
  title: string
  artist: string
  onChangeTitle: (value: string) => void
  onChangeArtist: (value: string) => void
  duration: number
  sampleRate: number
  channels: number
}

export default function SongMetadataForm({ title, artist, onChangeTitle, onChangeArtist, duration, sampleRate, channels }: Props) {
  return (
    <div>
      <div className="flex gap-3">
        <div className="flex-1 text-left">
          <label className="mb-1.5 block text-base font-semibold uppercase tracking-wider text-neon-cyan">
            Título
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => onChangeTitle(e.target.value)}
            className="cursor-target w-full  border border-white/5 bg-black px-5 py-3.5 text-lg text-text-primary outline-none transition-all focus:border-neon-pink/50 focus:ring-1 focus:ring-neon-pink/30"
          />
        </div>
        <div className="flex-1 text-left">
          <label className="mb-1.5 block text-base font-semibold uppercase tracking-wider text-neon-cyan">
            Artista
          </label>
          <input
            type="text"
            value={artist}
            onChange={(e) => onChangeArtist(e.target.value)}
            className="cursor-target w-full  border border-white/5 bg-black px-5 py-3.5 text-lg text-text-primary outline-none transition-all focus:border-neon-pink/50 focus:ring-1 focus:ring-neon-pink/30"
          />
        </div>
      </div>
      <p className="mt-2 text-sm text-text-muted">
        {duration.toFixed(1)}s &middot; {sampleRate}Hz &middot;{' '}
        {channels} canales
      </p>
    </div>
  )
}
