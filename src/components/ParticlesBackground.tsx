import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  hue: number
  alpha: number
  life: number
  maxLife: number
  phaseOffset: number
  angle: number
}

interface ParticlesBackgroundProps {
  playing: boolean
  beatPhaseRef: React.MutableRefObject<number>
  metronomeEnabled: boolean
}

export default function ParticlesBackground({ playing, beatPhaseRef, metronomeEnabled }: ParticlesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playingRef = useRef(playing)
  const metronomeRef = useRef(metronomeEnabled)
  playingRef.current = playing
  metronomeRef.current = metronomeEnabled

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const particles: Particle[] = []
    const mouse = { x: -1000, y: -1000 }

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY })

    function spawnParticle() {
      const w = canvas!.width
      const h = canvas!.height
      const edge = Math.floor(Math.random() * 4)
      let x: number, y: number
      if (edge === 0) { x = Math.random() * w; y = -5 }
      else if (edge === 1) { x = w + 5; y = Math.random() * h }
      else if (edge === 2) { x = Math.random() * w; y = h + 5 }
      else { x = -5; y = Math.random() * h }

      const maxLife = 200 + Math.random() * 300
      const angle = Math.atan2(h / 2 - y, w / 2 - x) + (Math.random() - 0.5) * 0.8
      const speed = 0.2 + Math.random() * 0.4

      const sizeMul = playingRef.current ? 2 : 1

      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (1 + Math.random() * 2) * sizeMul,
        hue: Math.random() < 0.5 ? 330 : 190,
        alpha: 0.3 + Math.random() * 0.4,
        life: 0,
        maxLife,
        phaseOffset: Math.random() * 0.3,
        angle,
      })
    }

    let lastSpawn = 0
    function draw(time: number) {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      const spawnInterval = playingRef.current ? 40 : 60
      if (time - lastSpawn > spawnInterval) {
        spawnParticle()
        lastSpawn = time
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]

        if (playingRef.current && metronomeRef.current) {
          const localPhase = (beatPhaseRef.current + p.phaseOffset + 1) % 1
          if (localPhase < 0.1) {
            const intensity = (1 - localPhase / 0.1)
            p.vx += Math.cos(p.angle) * intensity * 0.15
            p.vy += Math.sin(p.angle) * intensity * 0.15
          }
        }

        p.x += p.vx
        p.y += p.vy
        p.life++

        const progress = p.life / p.maxLife
        const alpha = p.alpha * (1 - progress) * (1 - progress)

        if (p.life >= p.maxLife) {
          particles.splice(i, 1)
          continue
        }

        let renderSize = p.size
        if (playingRef.current && metronomeRef.current) {
          const localPhase = (beatPhaseRef.current + p.phaseOffset + 1) % 1
          if (localPhase < 0.1) {
            renderSize *= 1 + (1 - localPhase / 0.1) * 2
          }
        }

        ctx!.beginPath()
        ctx!.arc(p.x, p.y, renderSize, 0, Math.PI * 2)
        ctx!.fillStyle = `hsla(${p.hue}, 80%, 60%, ${alpha})`
        ctx!.fill()

        const glowMul = playingRef.current ? 4 : 3
        if (renderSize > 1.5) {
          ctx!.beginPath()
          ctx!.arc(p.x, p.y, renderSize * glowMul, 0, Math.PI * 2)
          ctx!.fillStyle = `hsla(${p.hue}, 80%, 60%, ${alpha * 0.15})`
          ctx!.fill()
        }
      }

      animId = requestAnimationFrame(draw)
    }
    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  )
}
