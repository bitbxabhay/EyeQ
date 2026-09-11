import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import RiskBadge, { riskTone, scoreTone } from '../components/RiskBadge';
import { Button, Eyebrow, Panel, SectionRule } from '../components/ui';
import { currentPatient } from '../data/mockData';
import { fetchDashboard, toScreeningSession, type DashboardSummary } from '../lib/api';
import { classifyRisk } from '../lib/scoring';

interface DashboardProps {
  onNavigate: (page: string) => void;
  historyVersion: number;
  patientName: string;
  language?: 'en' | 'hi';
}

const BANDS = [
  { label: 'High', from: 0, to: 40, tone: riskTone.High },
  { label: 'Moderate', from: 40, to: 70, tone: riskTone.Medium },
  { label: 'Low', from: 70, to: 100, tone: riskTone.Low },
];

const BAND_LABELS = { en: ['High', 'Moderate', 'Low'], hi: ['उच्च', 'मध्यम', 'कम'] };

/**
 * A banded scale rather than a dial. A dial says "72 of 100"; this also shows
 * which band 72 falls in and how much headroom is left before the next one —
 * which is the part that changes what you do about it.
 */
function RiskScale({ score, language = 'en' }: { score: number; language?: 'en' | 'hi' }) {
  const classification = classifyRisk(score);
  const tone = classification.category ? riskTone[classification.category] : 'var(--color-ink-4)';
  const position = classification.gaugePosition ?? 0;
  const isActive = (label: string, from: number, to: number) => classification.category === label && position >= from && (label === 'Low' ? position <= to : position < to);
  return (
    <div>
      <div className="relative h-6">
        <div
          className="absolute top-0 -translate-x-1/2 whitespace-nowrap font-mono text-micro tracking-widest"
          style={{ left: `${position}%`, color: tone }}
        >
          {score}
        </div>
      </div>
      <div className="flex gap-px">
        {BANDS.map((b) => (
          <div
            key={b.label}
            style={{ width: `${b.to - b.from}%`, backgroundColor: b.tone }}
            className={isActive(b.label, b.from, b.to) ? 'h-1' : 'h-1 opacity-25'}
          />
        ))}
      </div>
      <div className="mt-2 flex">
        {BANDS.map((b, index) => (
          <div
            key={b.label}
            style={{ width: `${b.to - b.from}%` }}
            className={
              isActive(b.label, b.from, b.to)
                ? 'font-mono text-micro uppercase tracking-[0.12em] text-ink-2'
                : 'font-mono text-micro uppercase tracking-[0.12em] text-ink-4'
            }
          >
            {BAND_LABELS[language || 'en'][index]}
          </div>
        ))}
      </div>
    </div>
  );
}

function daysSince(iso: string) {
  const then = new Date(`${iso}T00:00:00`);
  const now = new Date();
  return Math.max(0, Math.round((now.getTime() - then.getTime()) / 86_400_000));
}

export default function Dashboard({ onNavigate, historyVersion, patientName, language = 'en' }: DashboardProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState(false);
  const [displayName] = useState(() => {
    const stored = localStorage.getItem('eyecare-patient-record');
    try {
      const savedPatient = stored ? JSON.parse(stored) : null;
      return typeof savedPatient?.name === 'string' && savedPatient.name.trim() ? savedPatient.name : patientName;
    } catch {
      return patientName;
    }
  });
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12
    ? language === 'hi' ? 'शुभ प्रभात' : 'Good morning'
    : currentHour < 17
      ? language === 'hi' ? 'शुभ दोपहर' : 'Good afternoon'
      : language === 'hi' ? 'शुभ संध्या' : 'Good evening';
  const t = {
    backend: language === 'hi' ? 'कॉन्फ़िगर किए गए API URL पर बैकएंड नहीं मिल सका — इसे शुरू करें (README देखें) ताकि यहाँ आपकी असली हिस्ट्री दिखे।' : 'Could not reach the backend at the configured API URL — start it (see README) to see your real history here.',
    none: language === 'hi' ? 'अभी कोई स्क्रीनिंग रिकॉर्ड नहीं है।' : 'No screenings recorded yet.',
    start: language === 'hi' ? 'शुरू करें' : 'Get started',
    cta1: language === 'hi' ? 'दृष्टि परीक्षण करें' : 'Take vision test',
    cta2: language === 'hi' ? 'रेटिना इमेज अपलोड करें' : 'Upload retinal image',
    describe: language === 'hi' ? 'एक बार आप किसी एक (या दोनों) को पूरा कर लेते हैं, तब यहाँ वास्तविक मूल्यांकन दिखाई देगा — यह डैशबोर्ड केवल वही दिखाता है जो सही से मापा गया है।' : 'Once you complete either (or both), a real assessment will appear here — this dashboard reflects only what has actually been measured.',
    last: language === 'hi' ? 'अंतिम स्क्रीनिंग' : 'Last screened',
    days: language === 'hi' ? 'दिन पहले' : 'days ago',
    on: language === 'hi' ? 'को' : 'on',
    standing: language === 'hi' ? 'स्थायी मूल्यांकन' : 'Standing assessment',
    startNew: language === 'hi' ? 'नई स्क्रीनिंग शुरू करें' : 'Start a new screening',
    why: language === 'hi' ? 'यह स्कोर क्यों' : 'Why this score',
    recent: language === 'hi' ? 'सबसे हालिया रीडिंग' : 'Most recent readings',
    acuityOD: language === 'hi' ? 'दृष्टि OD' : 'Acuity OD',
    acuityOS: language === 'hi' ? 'दृष्टि OS' : 'Acuity OS',
    screenings: language === 'hi' ? 'स्क्रीनिंग' : 'Screenings',
    lifetime: language === 'hi' ? 'कुल' : 'Lifetime',
    since: language === 'hi' ? 'अंतिम बार के बाद' : 'Since last',
    recheck: language === 'hi' ? 'पुनः जाँच' : 'Recheck at',
    findings: language === 'hi' ? 'अंतिम सत्र की खोजें' : 'Findings, last session',
    onRecord: language === 'hi' ? 'रिकॉर्ड में' : 'On record',
  };

  useEffect(() => {
    fetchDashboard()
      .then(setSummary)
      .catch(() => setError(true));
  }, [historyVersion]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-8 py-10 max-md:px-5">
        <Eyebrow className="mb-2">
          {new Date().toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Eyebrow>
        <h1 className="text-title font-semibold tracking-[-0.02em] text-ink">
          {greeting}, {displayName.split(' ')[0]}
        </h1>

        {error && (
          <p className="mt-2 text-sm text-high">{t.backend}</p>
        )}

        {!error && summary && !summary.latest && (
          <>
            <p className="mt-1.5 text-sm text-ink-3">{t.none}</p>
            <Panel tone="stated" className="mt-8 p-7 max-md:p-5">
              <Eyebrow className="mb-3">{t.start}</Eyebrow>
              <div className="text-head font-medium tracking-[-0.01em] text-ink">
                {language === 'hi' ? 'दृष्टि परीक्षण करें या रेटिना इमेज अपलोड करें' : 'Run a vision test or upload a retinal image'}
              </div>
              <p className="mt-2.5 max-w-md text-body leading-relaxed text-ink-2">{t.describe}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => onNavigate('vision-test')}>
                  {t.cta1}
                  <ArrowRight size={15} strokeWidth={2} aria-hidden />
                </Button>
                <Button variant="secondary" onClick={() => onNavigate('retinal')}>
                  {t.cta2}
                </Button>
              </div>
            </Panel>
          </>
        )}

        {!error && summary && summary.latest && (
          <DashboardBody summary={summary} onNavigate={onNavigate} language={language} />
        )}
      </div>
    </div>
  );
}

function DashboardBody({
  summary,
  onNavigate,
  language,
}: {
  summary: DashboardSummary;
  onNavigate: (page: string) => void;
  language: 'en' | 'hi';
}) {
  const last = toScreeningSession(summary.latest!);
  const elapsed = daysSince(last.date);
  const classification = classifyRisk(last.overallScore);
  const tone = classification.category ? riskTone[classification.category] : 'var(--color-ink-4)';
  const t = {
    last: language === 'hi' ? 'अंतिम स्क्रीनिंग' : 'Last screened',
    on: language === 'hi' ? 'को' : 'on',
    standing: language === 'hi' ? 'स्थायी मूल्यांकन' : 'Standing assessment',
    startNew: language === 'hi' ? 'नई स्क्रीनिंग शुरू करें' : 'Start a new screening',
    why: language === 'hi' ? 'यह स्कोर क्यों' : 'Why this score',
    recent: language === 'hi' ? 'सबसे हालिया रीडिंग' : 'Most recent readings',
    acuityOD: language === 'hi' ? 'दृष्टि OD' : 'Acuity OD',
    acuityOS: language === 'hi' ? 'दृष्टि OS' : 'Acuity OS',
    screenings: language === 'hi' ? 'स्क्रीनिंग' : 'Screenings',
    lifetime: language === 'hi' ? 'कुल' : 'Lifetime',
    since: language === 'hi' ? 'अंतिम बार के बाद' : 'Since last',
    recheck: language === 'hi' ? 'पुनः जाँच' : 'Recheck at',
    findings: language === 'hi' ? 'अंतिम सत्र की खोजें' : 'Findings, last session',
    onRecord: language === 'hi' ? 'रिकॉर्ड में' : 'On record',
  };

  return (
    <>
      <p className="mt-1.5 text-sm text-ink">
        {t.last} {elapsed} {language === 'hi' ? 'दिन पहले' : 'days ago'}, {t.on}{' '}
        {new Date(`${last.date}T00:00:00`).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-GB', { day: 'numeric', month: 'long' })}.
      </p>

      {/* Standing assessment */}
      <Panel tone="stated" className="mt-8 p-7 max-md:p-5">
        <div className="flex items-start justify-between gap-10 max-md:flex-col max-md:gap-6">
          <div className="min-w-0 flex-1">
            <Eyebrow className="mb-3">{t.standing}</Eyebrow>
            <div className="flex items-baseline gap-4">
              <span
                className="tnum font-mono text-hero font-medium tracking-[-0.02em]"
                style={{ color: tone }}
              >
                {last.overallScore}
              </span>
              {classification.category ? <RiskBadge level={classification.category} size="md" /> : <span className="font-mono text-label uppercase tracking-[0.12em] text-ink-4">Risk unavailable</span>}
            </div>
            <p className="mt-4 max-w-md text-body leading-relaxed text-ink-2">{classification.description}</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-3">{summary.latest!.summary}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => onNavigate('webcam')}>
                {t.startNew}
                <ArrowRight size={15} strokeWidth={2} aria-hidden />
              </Button>
              <Button variant="secondary" onClick={() => onNavigate('ai-analysis')}>
                {t.why}
              </Button>
            </div>
          </div>
          <div className="w-[280px] shrink-0 max-md:w-full">
            <RiskScale score={last.overallScore} language={language} />
          </div>
        </div>
      </Panel>

      {/* Readings */}
      <div className="mt-10">
        <SectionRule>{t.recent}</SectionRule>
        <div className="grid grid-cols-4 divide-x divide-line-soft border-y border-line-soft max-sm:grid-cols-2 max-sm:divide-x-0">
          {[
            { value: last.vaOD, label: t.acuityOD, sub: language === 'hi' ? 'दायाँ आँख' : 'Right eye' },
            { value: last.vaOS, label: t.acuityOS, sub: language === 'hi' ? 'बायाँ आँख' : 'Left eye' },
            { value: String(summary.total), label: t.screenings, sub: t.lifetime },
            { value: `${elapsed}d`, label: t.since, sub: `${t.recheck} 180d` },
          ].map((r, i) => (
            <div key={r.label} className={i === 0 ? 'py-5 pr-5' : 'py-5 pr-5 pl-5 max-sm:pl-0'}>
              <div className="tnum mb-1 font-mono text-head text-ink">{r.value}</div>
              <div className="font-mono text-micro uppercase tracking-[0.12em] text-ink-3">{r.label}</div>
              <div className="mt-0.5 text-micro text-ink-4">{r.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Findings */}
      <div className="mt-10 grid grid-cols-[1.3fr_1fr] gap-10 max-md:grid-cols-1 max-md:gap-8">
        <div>
          <SectionRule>{t.findings}</SectionRule>
          <ul>
            {last.conditions.map((c) => (
              <li
                key={c}
                className="flex items-baseline gap-3 border-b border-line-soft py-2.5 text-body text-ink-2 last:border-0"
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 translate-y-px rounded-full"
                  style={{ backgroundColor: c === 'No significant findings' ? 'var(--color-ink-4)' : riskTone.Medium }}
                />
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <SectionRule>{t.onRecord}</SectionRule>
          <ul>
            {currentPatient.conditions.map((c) => (
              <li key={c} className="border-b border-line-soft py-2.5 text-body text-ink-2 last:border-0">
                {c}
              </li>
            ))}
            {currentPatient.medications.map((m) => (
              <li key={m} className="border-b border-line-soft py-2.5 text-body text-ink-2 last:border-0">
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Prior screenings */}
      <div className="mt-10">
        <div className="mb-4 flex items-center gap-3">
          <Eyebrow>Prior screenings</Eyebrow>
          <div className="h-px flex-1 bg-line-soft" />
          <button
            onClick={() => onNavigate('history')}
            className="text-sm text-ink-3 transition-colors hover:text-ink"
          >
            All {summary.total}
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-line-soft text-left">
              {['Date', 'Type', 'OD / OS', 'Score', 'Assessment'].map((h) => (
                <th
                  key={h}
                  className="pb-2 font-mono text-micro font-normal uppercase tracking-[0.12em] text-ink-4 last:text-right"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.recent.map((r) => {
              const s = toScreeningSession(r);
              const recentClassification = classifyRisk(s.overallScore);
              return (
                <tr key={s.id} className="border-b border-line-soft last:border-0">
                  <td className="tnum py-3 pr-4 font-mono text-sm whitespace-nowrap text-ink-3">
                    {new Date(`${s.date}T00:00:00`).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3 pr-4 text-sm text-ink">{s.type}</td>
                  <td className="tnum py-3 pr-4 font-mono text-sm whitespace-nowrap text-ink-2">
                    {s.vaOD} / {s.vaOS}
                  </td>
                  <td className="tnum py-3 pr-4 font-mono text-sm" style={{ color: recentClassification.category ? riskTone[recentClassification.category] : 'var(--color-ink-4)' }}>
                    {s.overallScore}
                  </td>
                  <td className="py-3 text-right">
                    {recentClassification.category ? <RiskBadge level={recentClassification.category} /> : <span className="font-mono text-micro uppercase tracking-[0.12em] text-ink-4">Unavailable</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
