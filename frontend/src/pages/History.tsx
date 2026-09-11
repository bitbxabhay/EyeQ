import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import RiskBadge, { riskTone, scoreTone } from '../components/RiskBadge';
import { Button, Eyebrow, PageHeader, Row, SectionRule } from '../components/ui';
import { type ScreeningSession } from '../data/mockData';
import { fetchScreenings, toScreeningSession } from '../lib/api';

interface HistoryProps {
  historyVersion: number;
  language?: 'en' | 'hi';
}

/**
 * Score over time. A sparkline rather than a chart component — a handful of
 * points do not need axes, they need to show whether the line is going the
 * wrong way.
 */
function Trend({ sessions }: { sessions: ScreeningSession[] }) {
  const points = [...sessions].reverse();
  const scores = points.map((s) => s.overallScore);
  const min = Math.min(...scores) - 8;
  const max = Math.max(...scores) + 8;
  const w = 100;
  const h = 32;
  const x = (i: number) => (points.length <= 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (v: number) => h - ((v - min) / (max - min || 1)) * h;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline
        points={points.map((s, i) => `${x(i)},${y(s.overallScore)}`).join(' ')}
        fill="none"
        stroke="var(--color-ink-4)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      {points.map((s, i) => (
        <circle
          key={s.id}
          cx={x(i)}
          cy={y(s.overallScore)}
          r="2"
          fill={scoreTone(s.overallScore)}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

export default function History({ historyVersion, language = 'en' }: HistoryProps) {
  const [sessions, setSessions] = useState<ScreeningSession[] | null>(null);
  const t = {
    errorTitle: language === 'hi' ? 'रिकॉर्ड' : 'Records',
    errorSub: language === 'hi' ? 'पिछले स्क्रीनिंग' : 'Prior screenings',
    error: language === 'hi' ? 'बैकएंड शुरू करें, ताकि यहाँ आपकी वास्तविक हिस्ट्री दिखाई दे।' : 'Start the backend (see README) to see your real history here.',
    loading: language === 'hi' ? 'लोड हो रहा है…' : 'Loading…',
    noSessionsTitle: language === 'hi' ? 'रिकॉर्ड' : 'Records',
    noSessionsSub: language === 'hi' ? 'अभी कोई सत्र नहीं है — दृष्टि परीक्षण या रेटिना स्कैन पूरा करें।' : 'No sessions on file yet — complete a vision test or retinal scan to start one.',
    summary: language === 'hi' ? 'सत्र' : 'Sessions',
    lowRisk: language === 'hi' ? 'कम जोखिम' : 'Low risk',
    mean: language === 'hi' ? 'औसत स्कोर' : 'Mean score',
    trend: language === 'hi' ? 'स्कोर, सबसे पुराने से नए तक' : 'Score, oldest to newest',
    findings: language === 'hi' ? 'खोजें' : 'Findings',
    session: language === 'hi' ? 'सत्र' : 'Session',
    status: language === 'hi' ? 'स्थिति' : 'Status',
    assessment: language === 'hi' ? 'मूल्यांकन' : 'Assessment',
    score: language === 'hi' ? 'स्कोर' : 'Score',
    date: language === 'hi' ? 'तारीख' : 'Date',
    type: language === 'hi' ? 'प्रकार' : 'Type',
    odos: language === 'hi' ? 'OD / OS' : 'OD / OS',
    all: language === 'hi' ? 'सब' : 'All',
  };
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchScreenings()
      .then((records) => {
        const s = records.map(toScreeningSession);
        setSessions(s);
        setExpanded((prev) => prev ?? s[0]?.id ?? null);
      })
      .catch(() => setError(true));
  }, [historyVersion]);

  if (error) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-10 max-md:px-5">
          <PageHeader eyebrow={t.errorTitle} title={t.errorSub} sub={language === 'hi' ? 'बैकएंड से संपर्क नहीं हो सका।' : 'Could not reach the backend.'} />
          <p className="text-sm text-high">{t.error}</p>
        </div>
      </div>
    );
  }

  if (!sessions) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-10 max-md:px-5">
          <PageHeader eyebrow={t.errorTitle} title={t.errorSub} sub={t.loading} />
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-10 max-md:px-5">
          <PageHeader
            eyebrow={t.noSessionsTitle}
            title={t.noSessionsSub}
            sub={language === 'hi' ? 'अभी कोई रिकॉर्ड नहीं है।' : 'No sessions on file yet — complete a vision test or retinal scan to start one.'}
          />
        </div>
      </div>
    );
  }

  const avg = Math.round(sessions.reduce((a, s) => a + s.overallScore, 0) / sessions.length);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-8 py-10 max-md:px-5">
        <PageHeader
          eyebrow={t.errorTitle}
          title={t.errorSub}
          sub={language === 'hi' ? `${sessions.length} सत्र दर्ज हैं, सबसे नया पहले। ट्रेंड किसी एक स्कोर से ज़्यादा मायने रखता है।` : `${sessions.length} session${sessions.length === 1 ? '' : 's'} on file, most recent first. Trend matters more than any single score.`}
        />

        {/* Summary + trend */}
        <div className="grid grid-cols-[1fr_260px] gap-10 border-y border-line-soft py-6 max-md:grid-cols-1 max-md:gap-6">
          <div className="grid grid-cols-3 divide-x divide-line-soft">
            {[
              { value: String(sessions.length), label: t.summary },
              { value: String(sessions.filter((s) => s.riskLevel === 'Low').length), label: t.lowRisk },
              { value: String(avg), label: t.mean },
            ].map((s, i) => (
              <div key={s.label} className={i === 0 ? 'pr-5' : 'pr-5 pl-5'}>
                <div className="tnum mb-1 font-mono text-head text-ink">{s.value}</div>
                <div className="font-mono text-micro uppercase tracking-[0.12em] text-ink-4">{s.label}</div>
              </div>
            ))}
          </div>
          <div>
            <Eyebrow className="mb-2">{t.trend}</Eyebrow>
            <Trend sessions={sessions} />
          </div>
        </div>

        <div className="mt-10">
          <SectionRule>{t.summary}</SectionRule>
          <ul className="border-t border-line-soft">
            {sessions.map((session) => {
              const open = expanded === session.id;
              return (
                <li key={session.id} className="border-b border-line-soft">
                  <button
                    onClick={() => setExpanded(open ? null : session.id)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-5 py-4 text-left transition-colors hover:bg-panel/60 max-sm:flex-wrap"
                  >
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: riskTone[session.riskLevel] }}
                    />
                    <span className="tnum w-28 shrink-0 font-mono text-sm text-ink-3">
                      {new Date(`${session.date}T00:00:00`).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="min-w-0 flex-1 text-body text-ink">{session.type}</span>
                    <span className="tnum shrink-0 font-mono text-sm text-ink-2">
                      {session.vaOD} / {session.vaOS}
                    </span>
                    <span
                      className="tnum w-8 shrink-0 text-right font-mono text-body"
                      style={{ color: scoreTone(session.overallScore) }}
                    >
                      {session.overallScore}
                    </span>
                    <ChevronDown
                      size={15}
                      strokeWidth={1.75}
                      aria-hidden
                      className={
                        open
                          ? 'shrink-0 rotate-180 text-ink-2 transition-transform duration-200'
                          : 'shrink-0 text-ink-4 transition-transform duration-200'
                      }
                    />
                  </button>

                  {open && (
                    <div className="grid animate-rise grid-cols-2 gap-10 pb-5 max-sm:grid-cols-1 max-sm:gap-5">
                      <div>
                        <Eyebrow className="mb-1">{t.findings}</Eyebrow>
                        <ul>
                          {session.conditions.map((c) => (
                            <li key={c} className="border-b border-line-soft py-2 text-sm text-ink-2 last:border-0">
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <Eyebrow className="mb-1">{t.session}</Eyebrow>
                        <Row label={t.status}>{session.status}</Row>
                        <Row label={t.assessment}>
                          <RiskBadge level={session.riskLevel} />
                        </Row>
                        <Row label={t.score}>
                          <span className="tnum font-mono">{session.overallScore} / 100</span>
                        </Row>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
