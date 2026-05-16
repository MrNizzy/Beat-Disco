import { Icon } from '@iconify/react'

interface Props {
  visible: boolean
}

export default function DragOverlay({ visible }: Props) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4  border-2 border-dashed border-neon-cyan/60 px-12 py-16">
        <Icon icon="tabler:music" className="w-14 h-14 text-neon-cyan drop-shadow-[0_0_20px_rgba(0,240,255,0.6)]" />
        <p className="font-body text-2xl font-bold uppercase tracking-wider text-neon-cyan drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]">
          Suelta para cargar
        </p>
      </div>
    </div>
  )
}
