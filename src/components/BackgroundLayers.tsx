import ParticlesBackground from './ParticlesBackground'
import EdgeWaves from './EdgeWaves'
import BeatPulse from './BeatPulse'
import LiquidEther from './LiquidEther'

interface Props {
  playing: boolean
  beatPhaseRef: React.MutableRefObject<number>
  metronomeEnabled: boolean
  analyserRef: React.MutableRefObject<AnalyserNode | null>
}

export default function BackgroundLayers({ playing, beatPhaseRef, metronomeEnabled, analyserRef }: Props) {
  return (
    <>
      <ParticlesBackground playing={playing} beatPhaseRef={beatPhaseRef} metronomeEnabled={metronomeEnabled} />
      <EdgeWaves analyserRef={analyserRef} playing={playing} />
      <BeatPulse beatPhaseRef={beatPhaseRef} playing={playing} />
      <div
        className="fixed inset-0 z-[-2] pointer-events-none select-none"
        style={{
          backgroundImage: 'url(/charlie)',
          backgroundPosition: 'left bottom',
          backgroundSize: 'auto 80%',
          backgroundRepeat: 'no-repeat',
        }}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-[-1] pointer-events-none" aria-hidden="true">
        <LiquidEther
          colors={['#ff2d95', '#00f0ff', '#b300ff']}
          mouseForce={20}
          cursorSize={100}
          resolution={0.5}
          autoDemo={true}
          autoSpeed={0.5}
          autoIntensity={2.2}
        />
      </div>
    </>
  )
}
