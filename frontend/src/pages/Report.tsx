import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import RiskBadge, { scoreTone } from '../components/RiskBadge';
import { NOT_MEASURED } from '../data/reportContent';
import { Button, Eyebrow, Note, PageHeader, Row, SectionRule } from '../components/ui';
import { currentPatient } from '../data/mockData';
import { fetchScreenings, toScreeningSession, type ScreeningRecord } from '../lib/api';

interface ReportProps {
  onNavigate: (page: string) => void;
  historyVersion: number;
  patientName: string;
  language?: 'en' | 'hi';
}

export default function Report({ onNavigate, historyVersion, patientName }: ReportProps) {
  const [record, setRecord] = useState<ScreeningRecord | null | undefined>(undefined);
  const [pdfState, setPdfState] = useState<'idle' | 'working' | 'failed'>('idle');
  const now = new Date();

  useEffect(() => {
    fetchScreenings()
      .then((records) => setRecord(records[0] ?? null))
      .catch(() => setRecord(null));
  }, [historyVersion]);

  const handleDownload = async () => {
    if (!record) return;
    setPdfState('working');
    try {
      const session = toScreeningSession(record);
      const factors = record.factors
        .filter((f) => f.weight !== 0)
        .map((f) => ({ label: f.label, effect: (f.weight > 0 ? 'Raises' : 'Lowers') as 'Raises' | 'Lowers' }));
      const notMeasured = record.retinal_grade != null
        ? NOT_MEASURED.filter(([label]) => label !== 'Retinal photography')
        : NOT_MEASURED;

      const { downloadReportPdf } = await import('../components/ReportPdf');
      await downloadReportPdf({
        patient: currentPatient,
        session,
        score: record.overall_score,
        summary: record.summary,
        factors,
        notMeasured,
        recommendation: record.recommendation,
        recommendationDetail: record.recommendation,
      });
      setPdfState('idle');
    } catch (err) {
      console.error('PDF generation failed', err);
      setPdfState('failed');
    }
  };

  if (record === undefined) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-10 max-md:px-5">
          <PageHeader eyebrow="Interpret" title="Screening report" sub="Loading…" />
        </div>
      </div>
    );
  }

  if (record === null) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-10 max-md:px-5">
          <PageHeader
            eyebrow="Interpret"
            title="Screening report"
            sub="No screening on file yet — complete a vision test or retinal scan first."
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => onNavigate('vision-test')}>
              Take vision test
            </Button>
            <Button variant="secondary" onClick={() => onNavigate('retinal')}>
              Upload retinal image
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const session = toScreeningSession(record);
  const score = record.overall_score;
  const factors = record.factors.filter((f) => f.weight !== 0);
  const notMeasured =
    record.retinal_grade != null ? NOT_MEASURED.filter(([label]) => label !== 'Retinal photography') : NOT_MEASURED;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-8 py-10 max-md:px-5">
        {/* Controls — not part of the document */}
        <div className="mb-9 flex items-start justify-between gap-6 print:hidden">
          <div>
            <Eyebrow className="mb-2">Interpret</Eyebrow>
            <h1 className="text-title font-semibold tracking-[-0.02em] text-ink">Screening report</h1>
            <p className="mt-1.5 text-sm text-ink-3">
              Written to be handed to a clinician. The last section is the one they will care about most.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleDownload} disabled={pdfState === 'working'}>
                <Download size={14} strokeWidth={2} aria-hidden />
                {pdfState === 'working' ? 'Building PDF' : 'Download PDF'}
              </Button>
            </div>
            {pdfState === 'failed' && (
              <span className="text-micro text-high">
                Could not build the PDF.{' '}
                <button onClick={() => window.print()} className="underline hover:text-ink">
                  Print instead
                </button>
              </span>
            )}
          </div>
        </div>

        {/* The document */}
        <article className="border-t-2 border-ink pt-6">
          <header className="mb-9 flex items-start justify-between gap-6 max-sm:flex-col max-sm:gap-3">
            <div>
              <div className="text-head font-semibold tracking-[-0.01em] text-ink">
                EyeQ screening report
              </div>
              <div className="mt-1 font-mono text-micro tracking-[0.12em] text-ink-3 uppercase">
                Assisted screening · Not a diagnosis
              </div>
            </div>
            <div className="text-right max-sm:text-left">
              <div className="tnum font-mono text-sm text-ink-2">
                {now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div className="tnum font-mono text-micro text-ink-4">
                {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </header>

          <section className="mb-9">
            <SectionRule>Patient</SectionRule>
            <div className="grid grid-cols-2 gap-x-10 max-sm:grid-cols-1">
              <div>
                <Row label="Name">{patientName}</Row>
                <Row label="Date of birth">
                  <span className="tnum font-mono">
                    {new Date(`${currentPatient.dob}T00:00:00`).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </Row>
              </div>
              <div>
                <Row label="Session">
                  <span className="font-mono">{session.id.toUpperCase()}</span>
                </Row>
                <Row label="Report version">
                  <span className="font-mono">v1.0</span>
                </Row>
              </div>
            </div>
          </section>

          {/* Headline finding */}
          <section className="mb-9">
            <SectionRule>Assessment</SectionRule>
            <div className="flex items-baseline gap-4 border-b border-line-soft pb-5">
              <span
                className="tnum font-mono text-hero font-medium tracking-[-0.02em]"
                style={{ color: scoreTone(score) }}
              >
                {score}
              </span>
              <div>
                <RiskBadge level={session.riskLevel} size="md" />
                <div className="mt-1 text-sm text-ink-3">Composite screening score, 0 to 100</div>
              </div>
            </div>
            <p className="mt-5 max-w-prose text-body leading-relaxed text-ink-2">{record.summary}</p>
          </section>

          <section className="mb-9">
            <SectionRule>Acuity</SectionRule>
            <div className="grid grid-cols-2 divide-x divide-line-soft border-y border-line-soft">
              {[
                { va: session.vaOD, label: 'OD · Right eye' },
                { va: session.vaOS, label: 'OS · Left eye' },
              ].map((r, i) => (
                <div key={r.label} className={i === 0 ? 'py-5 pr-5' : 'py-5 pr-5 pl-5'}>
                  <Eyebrow className="mb-2">{r.label}</Eyebrow>
                  <div className="tnum font-mono text-title text-ink">{r.va}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-ink-3">
              Measured on a screen at an assumed viewing distance. Screen-based acuity, not a clinical
              refraction.
            </p>
          </section>

          {record.retinal_grade != null && (
            <section className="mb-9">
              <SectionRule>Retinal imaging</SectionRule>
              <Row label="Model grade">
                {record.retinal_grade} — {record.retinal_label}
              </Row>
              <Row label="Referral recommended">{record.retinal_refer ? 'Yes' : 'No'}</Row>
              <p className="mt-3 text-sm text-ink-3">
                Automated finding from an EfficientNet-B3 classifier (validation kappa 0.72), with a Grad-CAM
                attention map available in-app. Requires clinical confirmation.
              </p>
            </section>
          )}

          <section className="mb-9">
            <SectionRule>Contributing factors</SectionRule>
            {factors.length === 0 && <p className="text-sm text-ink-3">No factors recorded for this session.</p>}
            {factors.map((f) => (
              <Row key={f.label} label={f.label}>
                <span style={{ color: f.weight > 0 ? 'var(--color-moderate)' : 'var(--color-low)' }}>
                  {f.weight > 0 ? 'Raises' : 'Lowers'}
                </span>
              </Row>
            ))}
          </section>

          {/* The section that makes the report trustworthy */}
          <section className="mb-9">
            <SectionRule>Not measured in this session</SectionRule>
            {notMeasured.map(([label, detail]) => (
              <div key={label} className="border-b border-line-soft py-3 last:border-0">
                <div className="text-body text-ink">{label}</div>
                <div className="mt-0.5 text-sm text-ink-3">{detail}</div>
              </div>
            ))}
            <p className="mt-4 text-sm text-ink-2">
              A screening score built without these is incomplete by construction. It can raise a question;
              it cannot settle one.
            </p>
          </section>

          <section className="mb-9">
            <SectionRule>Recommendation</SectionRule>
            <div className="text-head font-medium tracking-[-0.01em] text-ink">{record.recommendation}</div>
            <div className="mt-5 print:hidden">
              <Button variant="primary" onClick={() => onNavigate('doctors')}>
                Find a hospital/clinic
              </Button>
            </div>
          </section>

          <footer className="border-t border-line-soft pt-6">
            <Note>
              This report was produced by an assisted screening prototype, run on a real trained retinal
              model where a retinal image was provided. It is not a medical diagnosis, prescription or
              clinical recommendation, and does not replace examination by a qualified ophthalmologist or
              optometrist. Do not make clinical decisions on this document alone. EyeQ, {now.getFullYear()}.
            </Note>
          </footer>
        </article>
      </div>
    </div>
  );
}
