import { Eyebrow, Row, SectionRule } from './ui';
import RiskBadge from './RiskBadge';
import { FACTORS, NOT_MEASURED } from '../data/reportContent';

/**
 * The deliverable, shown before sign-up. People are being asked to point a
 * camera at their face — letting them read the output first is the cheapest
 * trust you can buy. Scrolls inside its own frame so it occupies fixed height.
 */
export default function SampleReport() {
  return (
    <div className="overflow-hidden rounded-panel border border-line bg-panel">
      {/* Frame chrome */}
      <div className="flex items-center justify-between gap-4 border-b border-line-soft px-4 py-2.5">
        <div className="flex items-center gap-2 font-mono text-micro tracking-widest text-ink-3 uppercase">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink-4" />
          eyecare-report-s1-sample.pdf
        </div>
        <span className="font-mono text-micro tracking-widest text-ink-4 uppercase max-sm:hidden">
          Scroll to read
        </span>
      </div>

      {/* Document */}
      <div className="h-[440px] overflow-y-auto px-7 py-6 max-sm:h-[360px] max-sm:px-5">
        <article className="border-t-2 border-ink pt-5">
          <header className="mb-7 flex items-start justify-between gap-4">
            <div>
              <div className="text-body font-semibold tracking-[-0.01em] text-ink">
                EyeCare screening report
              </div>
              <div className="mt-1 font-mono text-micro tracking-widest text-ink-3 uppercase">
                Assisted screening · Not a diagnosis
              </div>
            </div>
            <div className="tnum text-right font-mono text-micro text-ink-4">Sample</div>
          </header>

          <section className="mb-7">
            <SectionRule>Patient</SectionRule>
            <Row label="Name">Jordan Alvarez</Row>
            <Row label="Date of birth">
              <span className="tnum font-mono">12 Apr 1988</span>
            </Row>
            <Row label="Session">
              <span className="font-mono">S1</span>
            </Row>
          </section>

          <section className="mb-7">
            <SectionRule>Assessment</SectionRule>
            <div className="flex items-baseline gap-4 border-b border-line-soft pb-4">
              <span
                className="tnum font-mono text-title font-medium tracking-[-0.02em]"
                style={{ color: 'var(--color-moderate)' }}
              >
                72
              </span>
              <div>
                <RiskBadge level="Medium" />
                <div className="mt-1 text-sm text-ink-3">Composite score, 0 to 100</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-2">
              Mild acuity asymmetry with the right eye one line behind the left, in a patient with a family
              history of glaucoma and a borderline pressure estimate. No retinal imaging was available. A
              comprehensive examination is recommended within three to six months.
            </p>
          </section>

          <section className="mb-7">
            <SectionRule>Acuity</SectionRule>
            <div className="grid grid-cols-2 divide-x divide-line-soft border-y border-line-soft">
              {[
                { va: '20/25', label: 'OD · Right' },
                { va: '20/20', label: 'OS · Left' },
              ].map((r, i) => (
                <div key={r.label} className={i === 0 ? 'py-4 pr-4' : 'py-4 pr-4 pl-4'}>
                  <Eyebrow className="mb-1.5">{r.label}</Eyebrow>
                  <div className="tnum font-mono text-head text-ink">{r.va}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-7">
            <SectionRule>Contributing factors</SectionRule>
            {FACTORS.map((f) => (
              <Row key={f.label} label={f.label}>
                <span
                  style={{
                    color: f.effect === 'Raises' ? 'var(--color-moderate)' : 'var(--color-low)',
                  }}
                >
                  {f.effect}
                </span>
              </Row>
            ))}
          </section>

          <section className="mb-7">
            <SectionRule>Not measured in this session</SectionRule>
            {NOT_MEASURED.map(([label, detail]) => (
              <div key={label} className="border-b border-line-soft py-2.5 last:border-0">
                <div className="text-sm text-ink">{label}</div>
                <div className="mt-0.5 text-micro text-ink-3">{detail}</div>
              </div>
            ))}
            <p className="mt-3 text-sm text-ink-2">
              A screening score built without these is incomplete by construction. It can raise a question;
              it cannot settle one.
            </p>
          </section>

          <section>
            <SectionRule>Recommendation</SectionRule>
            <div className="text-body font-medium text-ink">
              Comprehensive eye examination within three to six months
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-3">
              Request intraocular pressure measurement and optic nerve head assessment, given the family
              history. Confirm the right-eye refractive finding with a clinical refraction.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
