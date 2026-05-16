import { Icon } from '@iconify/react'

interface Props {
  loading: boolean
  onClick: () => void
}

export default function DropZone({ loading, onClick }: Props) {
  return (
    <section className="flex items-center justify-center min-h-[55vh] sm:min-h-[60vh]">
      <div
        onClick={onClick}
        className="group w-full cursor-pointer  border-2 border-dashed border-neon-pink/30 bg-surface/60 p-12 text-center backdrop-blur-sm transition-all duration-300 hover:border-neon-pink/70 hover:bg-surface hover:neon-glow-pink sm:p-16"
      >
        <div className="mb-4 flex justify-center text-neon-pink/50 transition-colors group-hover:text-neon-pink/80">
          <Icon icon="tabler:music" className="w-14 h-14 sm:w-16 sm:h-16" />
        </div>
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-neon-cyan border-t-transparent" />
            <p className="text-base text-text-secondary">Analizando audio...</p>
          </div>
        ) : (
          <>
            <p className="text-base font-semibold text-text-primary sm:text-lg">
              Haz clic o arrastra un archivo de audio
            </p>
            <p className="mt-3 text-sm text-text-muted"><span className="text-neon-pink">•</span> MP3  <span className="text-neon-pink">•</span> WAV  <span className="text-neon-pink">•</span> FLAC  <span className="text-neon-pink">•</span> OGG  <span className="text-neon-pink">•</span> M4A</p>
          </>
        )}
      </div>
    </section>
  )
}
