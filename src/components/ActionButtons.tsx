import { Icon } from '@iconify/react'

interface Props {
  onNewSong: () => void
  onEdit: () => void
  onExport: () => void
  exporting: boolean
}

export default function ActionButtons({ onNewSong, onEdit, onExport, exporting }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        onClick={onNewSong}
        className="cursor-target cursor-pointer inline-flex items-center justify-center gap-1.5  border border-white/5 bg-black/40 px-2 py-3 text-sm font-bold uppercase tracking-wider text-text-secondary transition-all hover:border-neon-cyan/30 hover:text-neon-cyan"
      >
        <Icon icon="tabler:music-plus" className="w-5 h-5 shrink-0" />
        <span className="truncate">Nueva canción</span>
      </button>
      <button
        onClick={onEdit}
        className="cursor-target cursor-pointer inline-flex items-center justify-center gap-1.5  border border-white/5 bg-black/40 px-2 py-3 text-sm font-bold uppercase tracking-wider text-text-secondary transition-all hover:border-neon-cyan/30 hover:text-neon-cyan"
      >
        <Icon icon="tabler:edit" className="w-5 h-5 shrink-0" />
        <span className="truncate">Editar</span>
      </button>
      <button
        onClick={onExport}
        disabled={exporting}
        className={`cursor-target bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan text-white px-2 py-3 text-sm font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 ${
          exporting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
        }`}
      >
        <Icon icon={exporting ? 'tabler:loader-2' : 'tabler:download'} className={`w-5 h-5 shrink-0 ${exporting ? 'animate-spin' : ''}`} />
        <span className="truncate">
          {exporting ? 'Generando ZIP...' : 'Exportar ZIP'}
        </span>
      </button>
    </div>
  )
}
