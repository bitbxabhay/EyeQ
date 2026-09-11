import { useEffect, useRef, useState } from 'react';
import {
  Aperture,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Eye,
  FileText,
  ScanFace,
  Stethoscope,
  Waves,
} from 'lucide-react';
import { OptotypeE, Wordmark } from '../components/Logo';
import SampleReport from '../components/SampleReport';
import { Button, Eyebrow, Note, Panel, SectionRule, cx } from '../components/ui';

interface LandingProps {
  onGetStarted: () => void;
  language?: 'en' | 'hi';
}

/**
 * The hero, set as a real acuity chart. Each line drops to the next Snellen
 * size, so the payoff line is the one you have to work slightly to read — the
 * page performs the test it is describing.
 */
const acuityLines = [
  { text: 'Most people who', label: '6/60', size: 76 },
  { text: 'cannot see well', label: '6/30', size: 54 },
  { text: 'just need glasses.', label: '6/21', size: 38 },
];

type Direction = 'up' | 'right' | 'down' | 'left';
const DIRECTION_ROTATION: Record<Direction, 0 | 90 | 180 | 270> = {
  right: 0,
  down: 90,
  left: 180,
  up: 270,
};
const DIRECTION_ICON = { up: ArrowUp, right: ArrowRight, down: ArrowDown, left: ArrowLeft };

const modules = [
  {
    icon: Eye,
    title: 'Acuity test',
    desc: 'Tumbling E or Snellen letters, sized against your screen dimensions and viewing distance. Results in 6/6 or 20/20, whichever your clinic uses.',
  },
  {
    icon: ScanFace,
    title: 'Eye detection',
    desc: 'Webcam face and iris localisation, to check the patient is sitting at the distance the test assumes.',
  },
  {
    icon: Aperture,
    title: 'Retinal analysis',
    desc: 'Reads an existing fundus photograph for signs of diabetic retinopathy, glaucomatous change and macular disease.',
  },
  {
    icon: Waves,
    title: 'Risk assessment',
    desc: 'Combines every input into one score, and shows which factors moved it, in which direction, and by how much.',
  },
  {
    icon: FileText,
    title: 'Written report',
    desc: 'A real PDF, with a section listing everything the screening could not measure. That is the part a clinician reads first.',
  },
];

/**
 * Four groups for whom the answer to "should I bother" is different, and a
 * reason specific to each. One paragraph addressed to everyone reaches nobody.
 */
const audiences = [
  {
    who: 'You squint, or hold things closer',
    why: 'Uncorrected refractive error is the largest single cause of visual impairment in the world, and almost all of it is fixed by a prescription someone never got around to measuring. It is also the thing a screen-based test detects best.',
    then: 'Ten minutes here tells you whether to book a refraction.',
  },
  {
    who: 'You live with diabetes',
    why: 'Diabetic retinopathy is the complication that gets forgotten, because it causes nothing at all until it causes a great deal. Annual retinal screening is the standard of care, and it is the appointment most often missed.',
    then: 'Bring a fundus image if you have one — this reads it in seconds.',
  },
  {
    who: 'Glaucoma runs in your family',
    why: 'A first-degree relative raises your own risk several times over, and the disease takes peripheral vision first, where you are least likely to notice it going.',
    then: 'Screen twice a year, and insist on a pressure reading at every visit.',
  },
  {
    who: 'The nearest clinic is far',
    why: 'If an eye test costs a day of travel and a day of lost pay, the honest question is not whether to go but whether it is worth going yet.',
    then: 'Screen first. Travel only if there is something to travel for.',
  },
];

const sequence = [
  { title: 'Record who is being screened', desc: 'Age, existing conditions, medications, family history.' },
  { title: 'Check the distance', desc: 'The camera confirms the patient is where the chart assumes they are.' },
  { title: 'Read the chart', desc: 'One eye at a time, down the lines. Around three minutes.' },
  { title: 'Add a fundus image', desc: 'Optional, and only if one already exists from a retinal camera.' },
  { title: 'Read the assessment', desc: 'The score, the factors behind it, and the confidence in each.' },
  { title: 'Refer if needed', desc: 'Straight through to a specialist, with the report attached.' },
];

const limits = [
  'It cannot photograph your retina. A webcam has no path to the back of the eye — that needs a fundus camera.',
  'It cannot measure intraocular pressure, the single most useful glaucoma number.',
  'It cannot write you a spectacle prescription. Screen acuity is an estimate, not a refraction.',
  'It cannot rule anything out. A normal result means nothing was found here, not that nothing is there.',
];

const EASE = 'cubic-bezier(0.16,1,0.3,1)';

/**
 * Scroll-reveal, Apple-keynote style: fades and rises into place the moment
 * it crosses into the viewport, once, and stays. Accepts `as` so it can be a
 * <li> without breaking flex/list semantics of its parent.
 */
function Reveal({
  children,
  className,
  delay = 0,
  y = 26,
  as = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: 'div' | 'li';
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as any;
  return (
    <Tag
      ref={ref as any}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : `translateY(${y}px) scale(0.98)`,
        transition: `opacity 760ms ${EASE} ${delay}ms, transform 760ms ${EASE} ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </Tag>
  );
}

/**
 * Continuous scroll parallax — shifts an element vertically based on how far
 * its centre sits from the viewport centre. Writes directly to the DOM node
 * (no re-render) so it stays smooth. This is the "things drift at different
 * speeds as you scroll" trick every Apple product page uses.
 */
function Parallax({
  children,
  className,
  strength = 0.06,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const el = ref.current;
    function update() {
      raf = 0;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const delta = (rect.top + rect.height / 2 - vh / 2) * strength;
      el.style.transform = `translateY(${delta}px)`;
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(update);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [strength]);

  return (
    <div ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  );
}

/** Fades and lifts the hero out as the page is scrolled past it. */
function HeroFade({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const el = ref.current;
    const range = 560;
    function update() {
      raf = 0;
      if (!el) return;
      const y = window.scrollY || window.pageYOffset;
      const p = Math.min(Math.max(y / range, 0), 1);
      el.style.opacity = String(1 - p * 0.7);
      el.style.transform = `translateY(${p * 36}px) scale(${1 - p * 0.035})`;
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(update);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div ref={ref} style={{ willChange: 'opacity, transform' }}>
      {children}
    </div>
  );
}

/**
 * A reusable 3D tilt wrapper. Tracks the cursor over the card, rotates it in
 * true 3D (perspective + rotateX/rotateY), lifts the inner content forward on
 * its own Z layer, and paints a soft light-glare that follows the pointer.
 */
function Tilt3D({
  children,
  className,
  innerClassName,
  strength = 10,
  lift = 18,
  glare = true,
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  strength?: number;
  lift?: number;
  glare?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ rx: 0, ry: 0, mx: 50, my: 50, active: false });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setState({
      rx: (0.5 - py) * strength * 2,
      ry: (px - 0.5) * strength * 2,
      mx: px * 100,
      my: py * 100,
      active: true,
    });
  }

  function handleLeave() {
    setState((s) => ({ ...s, rx: 0, ry: 0, active: false }));
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
      style={{ perspective: '1100px' }}
    >
      <div
        className={cx('relative', innerClassName)}
        style={{
          transform: `rotateX(${state.rx}deg) rotateY(${state.ry}deg)`,
          transformStyle: 'preserve-3d',
          transition: state.active ? 'transform 90ms ease-out' : 'transform 420ms cubic-bezier(0.22,1,0.36,1)',
          willChange: 'transform',
        }}
      >
        <div
          style={{
            transform: state.active ? `translateZ(${lift}px)` : 'translateZ(0px)',
            transformStyle: 'preserve-3d',
            transition: 'transform 420ms cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          {children}
        </div>
        {glare && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{
              background: `radial-gradient(480px circle at ${state.mx}% ${state.my}%, rgba(255,255,255,0.14), transparent 62%)`,
              opacity: state.active ? 1 : 0,
              transition: 'opacity 200ms ease-out',
            }}
          />
        )}
      </div>
    </div>
  );
}

/** MacBook-style frame. Whatever is passed in sits "on the screen". */
function LaptopFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md select-none">
      <div className="relative rounded-[20px] border border-white/10 bg-gradient-to-b from-neutral-800 to-neutral-950 p-3 shadow-[0_50px_90px_-30px_rgba(0,0,0,0.6)]">
        <div aria-hidden className="absolute left-1/2 top-1.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-neutral-600" />
        <div className="overflow-hidden rounded-[12px] bg-white">{children}</div>
      </div>
      <div aria-hidden className="relative mx-auto h-2.5 w-[93%] rounded-b-sm bg-gradient-to-b from-neutral-600 to-neutral-400" />
      <div aria-hidden className="relative mx-auto h-3.5 rounded-b-xl bg-gradient-to-b from-neutral-300 to-neutral-500 shadow-[0_16px_30px_-12px_rgba(0,0,0,0.55)]">
        <div className="absolute left-1/2 top-0 h-1 w-16 -translate-x-1/2 rounded-b-md bg-neutral-200/80" />
      </div>
    </div>
  );
}

/** Desktop-monitor frame, for content that reads more like something you'd view than use. */
function MonitorFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-lg select-none">
      <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-800 to-neutral-950 p-3 shadow-[0_50px_90px_-30px_rgba(0,0,0,0.6)]">
        <div aria-hidden className="absolute left-1/2 top-1.5 h-1 w-1 -translate-x-1/2 rounded-full bg-neutral-600" />
        <div className="max-h-[420px] overflow-y-auto overflow-x-hidden rounded-lg bg-white">{children}</div>
      </div>
      <div aria-hidden className="mx-auto h-9 w-3 bg-gradient-to-b from-neutral-700 to-neutral-500" />
      <div aria-hidden className="mx-auto h-2.5 w-32 rounded-full bg-gradient-to-b from-neutral-400 to-neutral-600 shadow-[0_14px_26px_-10px_rgba(0,0,0,0.55)]" />
    </div>
  );
}

/** Interactive Tumbling E — the differentiator, demonstrated rather than described. */
function TumblingDemo() {
  const [facing, setFacing] = useState<Direction>('right');

  return (
    <Reveal delay={80}>
      <Parallax strength={0.045}>
        <Tilt3D strength={6} lift={16}>
          <LaptopFrame>
            <div className="p-6">
              <div
                className="mb-5 flex items-center justify-center rounded-panel bg-neutral-50 py-12"
                style={{ transform: 'translateZ(30px)', transformStyle: 'preserve-3d' }}
              >
                <OptotypeE className="text-neutral-950" boxed={false} size={92} rotation={DIRECTION_ROTATION[facing]} />
              </div>
              <div className="mb-3 text-center text-sm text-ink-3">Which way does it open?</div>
              <div
                className="grid grid-cols-4 gap-2"
                style={{ transform: 'translateZ(12px)', transformStyle: 'preserve-3d' }}
              >
                {(['up', 'right', 'down', 'left'] as Direction[]).map((d) => {
                  const Icon = DIRECTION_ICON[d];
                  const active = facing === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setFacing(d)}
                      aria-label={`Opens ${d}`}
                      aria-pressed={active}
                      className={cx(
                        'flex items-center justify-center rounded-panel border py-4 transition-all duration-150',
                        active
                          ? 'border-ink bg-raised text-ink -translate-y-0.5 shadow-[0_8px_16px_-8px_rgba(0,0,0,0.4)]'
                          : 'border-line bg-ground text-ink-3 hover:border-ink-4 hover:text-ink-2',
                      )}
                    >
                      <Icon size={22} strokeWidth={1.75} aria-hidden />
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-center font-mono text-micro tracking-widest text-ink-4 uppercase">
                Try it — no reading required
              </p>
            </div>
          </LaptopFrame>
        </Tilt3D>
      </Parallax>
    </Reveal>
  );
}

export default function Landing({ onGetStarted, language = 'en' }: LandingProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="min-h-full overflow-y-auto bg-ground text-ink">
      <header className="sticky top-0 z-50 border-b border-line-soft bg-ground/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Wordmark />
            
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onGetStarted}>
              Sign in
            </Button>
            <Button variant="primary" size="sm" onClick={onGetStarted}>
              Start a screening
            </Button>
          </div>
        </div>
      </header>

      {/* Hero — fades and lifts out as you scroll past it, lines rise in on load */}
      <HeroFade>
        <section className="mx-auto max-w-5xl px-6 pt-24 pb-20 max-md:pt-14">
          <Eyebrow className="mb-10">Assisted eye screening · Not a diagnosis</Eyebrow>

          <h1 className="mb-10">
            {acuityLines.map((line, i) => (
              <span
                key={line.label}
                className="flex items-baseline gap-6 max-md:gap-3"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(22px)',
                  transition: `opacity 700ms ${EASE} ${i * 110}ms, transform 700ms ${EASE} ${i * 110}ms`,
                }}
              >
                <span
                  aria-hidden
                  className="w-14 shrink-0 pt-2 text-right font-mono text-micro tracking-widest text-ink-4 max-md:w-10"
                >
                  {line.label}
                </span>
                <span
                  className="block font-semibold tracking-[-0.035em] text-ink"
                  style={{
                    fontSize: `clamp(${line.size / 2.6}px, ${line.size / 11}vw, ${line.size}px)`,
                    lineHeight: 1.06,
                  }}
                >
                  {line.text}
                </span>
              </span>
            ))}
          </h1>

          <div
            className="flex gap-6 max-md:gap-3"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(18px)',
              transition: `opacity 700ms ${EASE} 380ms, transform 700ms ${EASE} 380ms`,
            }}
          >
            <div aria-hidden className="w-14 shrink-0 max-md:w-10" />
            <div className="max-w-xl">
              <p className="text-lead leading-relaxed text-ink-2">
                Uncorrected refractive error is the largest single cause of visual impairment worldwide, and
                the cheapest to fix. This screens for it in about ten minutes on an ordinary webcam, using a
                chart that needs no reading ability in any language.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button variant="primary" onClick={onGetStarted}>
                  Start a screening
                  <ArrowRight size={15} strokeWidth={2} aria-hidden />
                </Button>
              </div>

              <p className="mt-6 text-sm text-ink-4">
                Free, and nothing is uploaded. Results are an assisted screening estimate and do not replace
                examination by a qualified eye-care professional.
              </p>
            </div>
          </div>
        </section>
      </HeroFade>

      {/* Facts strip */}
      <section className="border-y border-line-soft">
        <div className="mx-auto grid max-w-5xl grid-cols-4 divide-x divide-line-soft px-6 max-md:grid-cols-2 max-md:divide-x-0 max-md:divide-y">
          {[
            { value: 'Under 10 min', label: 'Start to report' },
            { value: 'No literacy', label: 'Tumbling E chart' },
            { value: 'Webcam only', label: 'No added hardware' },
            { value: 'Clinic ready', label: 'Designed for eye-care visits' },
          ].map((f, i) => (
            <Reveal key={f.label} delay={i * 70} y={16}>
              <Tilt3D strength={5} lift={10} glare={false}>
                <div className={i === 0 ? 'py-7 pr-6' : 'py-7 pr-6 pl-6 max-md:pl-0'}>
                  <div className="mb-1 text-head font-medium tracking-[-0.01em] text-ink">{f.value}</div>
                  <div className="font-mono text-micro tracking-[0.12em] text-ink-4 uppercase">{f.label}</div>
                </div>
              </Tilt3D>
            </Reveal>
          ))}
        </div>
      </section>

      {/* The chart — the differentiator, demonstrated inside a laptop frame */}
      <section className="border-b border-line-soft">
        <div className="mx-auto grid max-w-5xl grid-cols-[1.15fr_1fr] gap-14 px-6 py-20 max-lg:grid-cols-1 max-lg:gap-8">
          <Reveal>
            <SectionRule>The chart</SectionRule>
            <h2 className="text-title font-semibold tracking-[-0.02em] text-ink">
              A letter chart tests literacy as much as it tests vision
            </h2>
            <p className="mt-4 text-body leading-relaxed text-ink-2">
              The standard Snellen chart asks the patient to name Latin characters. Anyone who cannot read
              them fails the test for reasons that have nothing to do with their eyes — which excludes a
              large part of exactly the population that most needs screening.
            </p>
            <p className="mt-4 text-body leading-relaxed text-ink-2">
              The Tumbling E carries one symbol in four rotations. The patient points which way it opens.
              No alphabet, no language, no schooling required. It is what vision camps have used for
              decades, and it is the default here.
            </p>
            <ul className="mt-7">
              {[
                ['Works in any language', 'Nothing to read, nothing to translate'],
                ['Works with children', 'A four-year-old can point'],
                ['Same clinical scale', 'Scores identically to a letter chart'],
              ].map(([title, sub]) => (
                <li key={title} className="border-b border-line-soft py-3 last:border-0">
                  <div className="text-body text-ink">{title}</div>
                  <div className="mt-0.5 text-sm text-ink-3">{sub}</div>
                </li>
              ))}
            </ul>
          </Reveal>
          <TumblingDemo />
        </div>
      </section>

      {/* Who this is for */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <SectionRule>Whether this is for you</SectionRule>
        <div className="grid grid-cols-2 gap-x-12 max-md:grid-cols-1">
          {audiences.map((a, i) => (
            <Reveal key={a.who} delay={(i % 2) * 90} y={20}>
              <Tilt3D strength={4} lift={12} glare={false}>
                <div className="border-b border-line-soft py-6">
                  <h3 className="mb-2 text-head font-semibold tracking-[-0.01em] text-ink">{a.who}</h3>
                  <p className="text-sm leading-relaxed text-ink-3">{a.why}</p>
                  <p className="mt-3 border-l-2 border-line py-0.5 pl-3 text-sm text-ink-2">{a.then}</p>
                </div>
              </Tilt3D>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-sm text-ink-4">
          None of these describe you? Then a screening every couple of years is plenty, and this is a fast
          way to do one.
        </p>
      </section>

      {/* The deliverable, before sign-up — the report on a monitor */}
      <section className="border-t border-line-soft">
        <div className="mx-auto grid max-w-5xl grid-cols-[1fr_1.35fr] gap-12 px-6 py-20 max-lg:grid-cols-1 max-lg:gap-8">
          <Reveal>
            <SectionRule>What you walk away with</SectionRule>
            <h2 className="text-title font-semibold tracking-[-0.02em] text-ink">
              Read the report before you sign up
            </h2>
            <p className="mt-3 text-body leading-relaxed text-ink-2">
              This is the real output, in full. It states what was measured, what moved the score, and — in
              its own section — everything the screening could not check.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ink-3">
              It is written to be handed to a clinician. That last section is the part they will read first,
              because it tells them what still needs doing.
            </p>
            <div className="mt-7">
              <Button variant="secondary" onClick={onGetStarted}>
                Produce your own
                <ArrowRight size={15} strokeWidth={2} aria-hidden />
              </Button>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <Parallax strength={0.04}>
              <Tilt3D strength={5} lift={16}>
                <MonitorFrame>
                  <SampleReport />
                </MonitorFrame>
              </Tilt3D>
            </Parallax>
          </Reveal>
        </div>
      </section>

      {/* Modules */}
      <section className="border-t border-line-soft">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <SectionRule>What it does</SectionRule>
          <div className="grid grid-cols-3 gap-x-10 gap-y-9 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {modules.map((m, i) => {
              const Icon = m.icon;
              return (
                <Reveal key={m.title} delay={i * 70} y={20}>
                  <Tilt3D strength={8} lift={16}>
                    <div className="rounded-panel p-1">
                      <div style={{ transform: 'translateZ(24px)', transformStyle: 'preserve-3d' }}>
                        <Icon size={17} strokeWidth={1.5} className="mb-3 text-ink-3" aria-hidden />
                      </div>
                      <h3 className="mb-1.5 text-body font-semibold text-ink">{m.title}</h3>
                      <p className="text-sm leading-relaxed text-ink-3">{m.desc}</p>
                    </div>
                  </Tilt3D>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sequence */}
      <section className="border-t border-line-soft">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <SectionRule>The sequence</SectionRule>
          <ol className="grid grid-cols-2 gap-x-12 max-md:grid-cols-1">
            {sequence.map((s, i) => (
              <Reveal as="li" key={s.title} delay={(i % 2) * 60} y={16} className="flex gap-5 border-b border-line-soft py-5 last:border-b-0">
                <span aria-hidden className="tnum w-6 shrink-0 pt-0.5 font-mono text-label text-ink-4">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <div className="mb-1 text-body font-medium text-ink">{s.title}</div>
                  <div className="text-sm leading-relaxed text-ink-3">{s.desc}</div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Limits */}
      <section className="border-t border-line-soft">
        <div className="mx-auto grid max-w-5xl grid-cols-[1fr_1.4fr] gap-12 px-6 py-20 max-md:grid-cols-1 max-md:gap-8">
          <Reveal>
            <h2 className="text-title font-semibold tracking-[-0.02em] text-ink">What it cannot do</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-3">
              Worth knowing before you start, so the result means what you think it means.
            </p>
          </Reveal>
          <ul className="space-y-4">
            {limits.map((l, i) => (
              <Reveal as="li" key={l} delay={i * 60} y={14} className="border-l-2 border-line py-0.5 pl-4 text-body leading-relaxed text-ink-2">
                {l}
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Close */}
      <section className="border-t border-line-soft">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <Reveal>
            <Tilt3D strength={4} lift={14} glare={false}>
              <Panel
                tone="stated"
                className="flex items-center justify-between gap-8 p-8 max-md:flex-col max-md:items-start"
              >
                <div>
                  <h2 className="text-head font-semibold tracking-[-0.01em] text-ink">
                    Ten minutes, and you will know where you stand.
                  </h2>
                  <p className="mt-1.5 text-sm text-ink-3">
                    Or where you do not, which is the more useful half.
                  </p>
                </div>
                <Button variant="primary" onClick={onGetStarted} className="shrink-0">
                  Start a screening
                  <ArrowRight size={15} strokeWidth={2} aria-hidden />
                </Button>
              </Panel>
            </Tilt3D>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-line-soft">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="mb-6 flex items-center gap-2.5">
            <Wordmark />
            <Stethoscope size={14} strokeWidth={1.5} className="ml-2 text-ink-4" aria-hidden />
            <span className="text-sm text-ink-4">Assisted screening, honestly scoped</span>
          </div>
          <Note>
            EyeCare is a research prototype. It is an assisted screening tool and does not provide medical
            diagnoses, prescriptions or clinical advice. All figures shown in this build are demonstration
            data. Always consult a qualified eye-care professional.
          </Note>
        </div>
      </footer>
    </div>
  );
}