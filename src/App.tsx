import { useEffect, useRef, useState } from 'react'
import { Cpu, Radio, Archive, Zap } from 'lucide-react'

// ── Hooks ──────────────────────────────────────────────────────────

function useMousePosition() {
  const [pos, setPos] = useState({ x: -999, y: -999 })

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const handler = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handler, { passive: true })
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  return pos
}

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible')
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

// ── ParticleCanvas ─────────────────────────────────────────────────

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    type Particle = { x: number; y: number; vx: number; vy: number; opacity: number; radius: number }
    const particles: Particle[] = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.35 + 0.05,
      radius: Math.random() * 1.5 + 0.5,
    }))

    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        if (!prefersReduced) {
          p.x += p.vx
          p.y += p.vy
          if (p.x < 0) p.x = w
          if (p.x > w) p.x = 0
          if (p.y < 0) p.y = h
          if (p.y > h) p.y = 0
        }
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(192,192,192,${p.opacity})`
        ctx.fill()
      }
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  )
}

// ── WireframeSphere ────────────────────────────────────────────────

type Ring = { rotX: number; rotY: number; scale: number; offsetY?: number; opacity: number }

const RINGS: Ring[] = [
  { rotX: 90, rotY: 0,   scale: 1,    opacity: 0.22 },
  { rotX: 0,  rotY: 0,   scale: 1,    opacity: 0.18 },
  { rotX: 0,  rotY: 60,  scale: 1,    opacity: 0.18 },
  { rotX: 0,  rotY: 120, scale: 1,    opacity: 0.18 },
  { rotX: 90, rotY: 0,   scale: 0.87, offsetY: -28, opacity: 0.15 },
  { rotX: 90, rotY: 0,   scale: 0.87, offsetY:  28, opacity: 0.15 },
  { rotX: 90, rotY: 0,   scale: 0.5,  offsetY: -52, opacity: 0.11 },
  { rotX: 90, rotY: 0,   scale: 0.5,  offsetY:  52, opacity: 0.11 },
]

function WireframeSphere({ tiltX, tiltY }: { tiltX: number; tiltY: number }) {
  const size = 250

  return (
    <div style={{ perspective: '900px' }}>
      <div
        style={{
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tiltY}deg) rotateY(${tiltX}deg)`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            animation: 'sphere-rotate 22s linear infinite',
          }}
        >
          {RINGS.map((ring, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: `1px solid rgba(192,192,192,${ring.opacity})`,
                transform: `rotateX(${ring.rotX}deg) rotateY(${ring.rotY}deg) translateY(${ring.offsetY ?? 0}px) scale(${ring.scale})`,
              }}
            />
          ))}
          <div
            style={{
              position: 'absolute',
              inset: '30%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(192,192,192,0.035) 0%, transparent 70%)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ── MouseFollower ──────────────────────────────────────────────────

function MouseFollower({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="mouse-follower"
      style={{ left: x, top: y }}
      aria-hidden="true"
    />
  )
}

// ── Navigation ─────────────────────────────────────────────────────

const NAV_LINKS = ['Signal', 'Archive', 'Motion', 'Void'] as const

function Navigation() {
  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.4rem 2.5rem',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        background: 'rgba(0,0,0,0.55)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <span
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.75rem',
          letterSpacing: '0.28em',
          color: '#d8d8d8',
          textTransform: 'uppercase',
        }}
      >
        OUCKAI
      </span>
      <div style={{ display: 'flex', gap: 'clamp(1.2rem, 3vw, 2.5rem)' }}>
        {NAV_LINKS.map((label) => (
          <a
            key={label}
            href={`#${label.toLowerCase()}`}
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.62rem',
              letterSpacing: '0.2em',
              color: '#484848',
              textDecoration: 'none',
              textTransform: 'uppercase',
              transition: 'color 0.25s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#a8a8a8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#484848')}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  )
}

// ── HeroSection ────────────────────────────────────────────────────

function HeroSection({ mouse }: { mouse: { x: number; y: number } }) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const tiltX = prefersReduced ? 0 : ((mouse.x / (window.innerWidth || 1)) - 0.5) * 14
  const tiltY = prefersReduced ? 0 : ((mouse.y / (window.innerHeight || 1)) - 0.5) * -9

  return (
    <section
      id="void"
      style={{
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ParticleCanvas />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <WireframeSphere tiltX={tiltX} tiltY={tiltY} />
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          padding: '0 1.5rem',
          maxWidth: '720px',
        }}
      >
        <p
          className="fade-in-1"
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.62rem',
            letterSpacing: '0.32em',
            color: '#363636',
            textTransform: 'uppercase',
            marginBottom: '2.5rem',
          }}
        >
          OUCKAI / Transmission
        </p>

        <h1
          className="fade-in-2"
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 300,
            fontSize: 'clamp(1.9rem, 5.5vw, 3.8rem)',
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            color: '#e8e8e8',
            marginBottom: '2rem',
          }}
        >
          A signal from
          <br />a future version of myself
        </h1>

        <p
          className="fade-in-3"
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 'clamp(0.68rem, 1.4vw, 0.8rem)',
            letterSpacing: '0.1em',
            lineHeight: 1.9,
            color: '#444444',
            maxWidth: '460px',
            margin: '0 auto 3rem',
          }}
        >
          A quiet visual system built from memory,
          <br />motion, and imagined machines.
        </p>

        <div
          className="fade-in-4"
          style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <button className="btn-primary">Enter the Void</button>
          <button className="btn-ghost">Watch the Signal</button>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '28%',
          background: 'linear-gradient(to top, #000 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
    </section>
  )
}

// ── SignalSection ──────────────────────────────────────────────────

const SIGNAL_TEXT = [
  'Somewhere between the last signal and the next silence, there is a machine that remembers everything you almost said. It waits in the frequency between transmission and meaning.',
  'The archive is not a record. It is a residue — the ghost pattern left when thought moves faster than language, and language moves faster than form.',
  'You are receiving this from a version of yourself that has already been through the quiet. Trust the signal. Disregard the noise.',
]

function SignalSection() {
  return (
    <section
      id="signal"
      style={{
        padding: 'clamp(5rem, 12vw, 10rem) 2rem',
        maxWidth: '680px',
        margin: '0 auto',
      }}
    >
      <div className="reveal" style={{ marginBottom: '3rem' }}>
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.62rem',
            letterSpacing: '0.25em',
            color: '#343434',
            textTransform: 'uppercase',
          }}
        >
          / Signal /
        </span>
      </div>
      {SIGNAL_TEXT.map((text, i) => (
        <div
          key={i}
          className="reveal"
          style={{ transitionDelay: `${i * 0.18}s`, marginBottom: '2.2rem' }}
        >
          <p
            style={{
              fontSize: 'clamp(0.9rem, 1.8vw, 1.05rem)',
              lineHeight: 1.95,
              color: '#606060',
              fontWeight: 300,
            }}
          >
            {text}
          </p>
        </div>
      ))}
    </section>
  )
}

// ── ArchiveSection ─────────────────────────────────────────────────

const ARCHIVE_CARDS = [
  {
    icon: <Cpu size={18} strokeWidth={1} />,
    title: 'Memory Engine',
    desc: 'A recursive structure that stores not events but the emotional temperature of events. Heat-mapped, silent, indexless.',
  },
  {
    icon: <Radio size={18} strokeWidth={1} />,
    title: 'Motion Field',
    desc: 'The invisible grammar of movement — every gesture leaves a trace in the field that slowly decays over seven days.',
  },
  {
    icon: <Archive size={18} strokeWidth={1} />,
    title: 'Silent Interface',
    desc: 'No inputs. No outputs. A system that responds only to attention, and only when you have stopped trying.',
  },
  {
    icon: <Zap size={18} strokeWidth={1} />,
    title: 'Future Artifact',
    desc: 'An object retrieved from a time that has not arrived. Its function is unclear. Its presence is unmistakable.',
  },
]

function ArchiveSection() {
  return (
    <section
      id="archive"
      style={{ padding: 'clamp(4rem, 10vw, 8rem) clamp(1.5rem, 5vw, 4rem)' }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div className="reveal" style={{ marginBottom: '3rem' }}>
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.62rem',
              letterSpacing: '0.25em',
              color: '#343434',
              textTransform: 'uppercase',
            }}
          >
            / Archive /
          </span>
        </div>
        <div
          className="reveal"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '1.25rem',
            transitionDelay: '0.12s',
          }}
        >
          {ARCHIVE_CARDS.map((card) => (
            <div key={card.title} className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ color: '#484848', marginBottom: '1.25rem' }}>{card.icon}</div>
              <h3
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.68rem',
                  letterSpacing: '0.15em',
                  color: '#888888',
                  textTransform: 'uppercase',
                  marginBottom: '1rem',
                }}
              >
                {card.title}
              </h3>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.75, color: '#464646', fontWeight: 300 }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── MotionSection ──────────────────────────────────────────────────

const MARQUEE_TEXT = 'MEMORY  ·  SIGNAL  ·  VOID  ·  MACHINE  ·  FUTURE  ·  OUCKAI  ·  '

function MotionSection() {
  const textStyle: React.CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 'clamp(0.62rem, 1.2vw, 0.82rem)',
    letterSpacing: '0.32em',
    color: 'rgba(115,115,115,0.45)',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  }

  return (
    <section
      id="motion"
      style={{
        padding: 'clamp(3rem, 6vw, 5rem) 0',
        overflow: 'hidden',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: 'max-content',
          animation: 'marquee 35s linear infinite',
        }}
      >
        <span style={textStyle}>{MARQUEE_TEXT.repeat(4)}</span>
        <span style={textStyle} aria-hidden="true">{MARQUEE_TEXT.repeat(4)}</span>
      </div>
    </section>
  )
}

// ── FinalSection ───────────────────────────────────────────────────

function FinalSection() {
  return (
    <section
      style={{
        padding: 'clamp(8rem, 18vw, 14rem) 2rem clamp(4rem, 8vw, 7rem)',
        textAlign: 'center',
      }}
    >
      <div className="reveal">
        <p
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 'clamp(1rem, 2.8vw, 1.75rem)',
            fontWeight: 300,
            lineHeight: 2.2,
            color: 'rgba(185,185,185,0.65)',
            letterSpacing: '0.03em',
          }}
        >
          Not a portfolio.
          <br />
          Not a product.
          <br />
          Just a place to disappear.
        </p>
      </div>
      <div className="reveal" style={{ marginTop: '5rem', transitionDelay: '0.25s' }}>
        <footer
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.6rem',
            letterSpacing: '0.22em',
            color: 'rgba(85,85,85,0.5)',
            textTransform: 'uppercase',
          }}
        >
          OUCKAI
          <span style={{ margin: '0 1.5rem', opacity: 0.4 }}>·</span>
          Signal ends here
        </footer>
      </div>
    </section>
  )
}

// ── App ────────────────────────────────────────────────────────────

export default function App() {
  useScrollReveal()
  const mouse = useMousePosition()

  return (
    <div className="scanlines grain" style={{ backgroundColor: '#000', minHeight: '100vh' }}>
      <MouseFollower x={mouse.x} y={mouse.y} />
      <Navigation />
      <HeroSection mouse={mouse} />
      <SignalSection />
      <ArchiveSection />
      <MotionSection />
      <FinalSection />
    </div>
  )
}
