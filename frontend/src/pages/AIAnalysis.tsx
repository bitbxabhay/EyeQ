import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import RiskBadge, { riskTone, scoreTone } from '../components/RiskBadge';
import { Button, Eyebrow, Note, PageHeader, Panel, SectionRule, Tag } from '../components/ui';
import { classifyRisk, computeAssessment, type VisionOutcome } from '../lib/scoring';
import { createReferral, saveScreening, type Factor, type PredictResult, type ScreeningIn } from '../lib/api';

interface AIAnalysisProps {
  onNavigate: (page: string) => void;
  vision: VisionOutcome | null;
  retinal: PredictResult | null;
  onSaved?: () => void;
  patientName?: string;
  language?: 'en' | 'hi';
}

/**
 * Factors diverge from a centre axis: right raises risk, left lowers it. A
 * one-directional bar chart hides that some findings are protective, which is
 * the more reassuring half of the picture.
 */
function FactorChart({ factors, language = 'en' }: { factors: Factor[]; language?: 'en' | 'hi' }) {
  const max = Math.max(1, ...factors.map((f) => Math.abs(f.weight)));
  const t = {
    lowers: language === 'hi' ? 'जोखिम कम करता है' : 'Lowers risk',
    raises: language === 'hi' ? 'जोखिम बढ़ाता है' : 'Raises risk',
  };

  return (
    <div>
      <div className="mb-3 flex font-mono text-micro tracking-[0.12em] text-ink-4 uppercase">
        <span className="w-1/2 pr-3 text-right">{t.lowers}</span>
        <span className="w-1/2 pl-3">{t.raises}</span>
      </div>
      <ul className="border-t border-line-soft">
        {factors.map((f) => {
          const raises = f.weight > 0;
          const tone = raises ? riskTone.Medium : riskTone.Low;
          const pct = (Math.abs(f.weight) / max) * 50;
          return (
            <li key={f.label} className="border-b border-line-soft py-3">
              <div className="relative h-1.5">
                <div className="absolute inset-y-0 left-1/2 w-px bg-line" />
                <div
                  className="absolute top-0 h-1.5"
                  style={{
                    backgroundColor: tone,
                    width: `${pct}%`,
                    left: raises ? '50%' : `${50 - pct}%`,
                  }}
                />
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 items-baseline gap-2.5">
                  <span className="text-sm text-ink">{f.label}</span>
                  <Tag>{f.category}</Tag>
                </div>
                <span className="tnum shrink-0 font-mono text-micro" style={{ color: tone }}>
                  {f.weight === 0 ? '·' : raises ? '+' : '−'}
                  {f.weight !== 0 && Math.abs(f.weight)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function AIAnalysis({ onNavigate, vision, retinal, onSaved, patientName = 'Patient', language = 'en' }: AIAnalysisProps) {
  const assessment: ScreeningIn = computeAssessment(vision, retinal);
  const { overall_score: score, factors, conditions, summary, recommendation } = assessment;
  const classification = classifyRisk(score);
  const riskLevel = classification.category ?? assessment.risk_level;
  const tone = classification.category ? riskTone[classification.category] : scoreTone(score);
  const t = {
    assessTitle: language === 'hi' ? 'जोखिम मूल्यांकन' : 'Risk assessment',
    assessSub: language === 'hi'
      ? 'इस सत्र में आपने जो कुछ पूरा किया है, उसी के आधार पर एक स्कोर बनता है और पूरा काम इसके पीछे है।'
      : 'One score from every input you actually completed this session, and the full working behind it.',
    noDataTitle: language === 'hi' ? 'जोखिम मूल्यांकन' : 'Risk assessment',
    noDataSub: language === 'hi'
      ? 'अभी कुछ भी मापा नहीं गया — पहले दृष्टि परीक्षण करें या रेटिना इमेज अपलोड करें।'
      : 'Nothing to assess yet — run the vision test or upload a retinal image first.',
    takeTest: language === 'hi' ? 'दृष्टि परीक्षण करें' : 'Take vision test',
    uploadImage: language === 'hi' ? 'रेटिना इमेज अपलोड करें' : 'Upload retinal image',
    score: language === 'hi' ? 'स्कोर' : 'Score',
    whatToDo: language === 'hi' ? 'अब क्या करें' : 'What to do',
    findSpecialist: language === 'hi' ? 'अस्पताल/क्लिनिक खोजें' : 'Find a hospital/clinic',
    openReport: language === 'hi' ? 'रिपोर्ट खोलें' : 'Open the report',
    moved: language === 'hi' ? 'स्कोर को क्या बदला' : 'What moved the score',
    byModule: language === 'hi' ? 'मॉड्यूल अनुसार' : 'By module',
    module: language === 'hi' ? 'मॉड्यूल' : 'Module',
    status: language === 'hi' ? 'स्थिति' : 'Status',
    result: language === 'hi' ? 'परिणाम' : 'Result',
    conf: language === 'hi' ? 'विश्वास' : 'Conf.',
    risk: language === 'hi' ? 'जोखिम' : 'Risk',
    complete: language === 'hi' ? 'पूर्ण' : 'Complete',
    notRun: language === 'hi' ? 'इस सत्र में नहीं किया गया' : 'Not run',
    notCompleted: language === 'hi' ? 'इस सत्र में पूरा नहीं हुआ' : 'Not completed this session',
    low: language === 'hi' ? 'कम' : 'Low',
    medium: language === 'hi' ? 'मध्यम' : 'Medium',
    high: language === 'hi' ? 'उच्च' : 'High',
    saveError: language === 'hi' ? 'इस आकलन को हिस्ट्री में सेव नहीं किया जा सका — बैकएंड शायद चल नहीं रहा है।' : 'Could not save this assessment to your history — the backend may not be running.',
    note: language === 'hi'
      ? 'यह सहायक स्क्रीनिंग स्कोर है, न कि निदान। यह केवल उस चीज़ से बना है जिसे इस सत्र में वास्तव में मापा जा सका — “नहीं किया गया” मॉड्यूल को स्कोर में शामिल नहीं किया गया, उसे सामान्य मानकर नहीं छोड़ा गया। कम स्कोर का मतलब ऑल-क्लियर नहीं है।'
      : 'This is an assisted screening score, not a diagnosis. It is built only from what this tool could actually measure this session — a module marked "Not run" was left out of the score entirely, not assumed normal. A low score is not an all-clear.',
    vision: language === 'hi' ? 'दृष्टि परीक्षण' : 'Vision test',
    retinal: language === 'hi' ? 'रेटिना इमेजिंग' : 'Retinal imaging',
    noImage: language === 'hi' ? 'इस सत्र में कोई फंडस इमेज नहीं दी गई' : 'No fundus image was provided',
  };

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const savedOnce = useRef(false);

  // Persist once per visit to this page — this is what makes Dashboard and
  // History show a real record instead of nothing. Revisiting after a new
  // vision test or scan creates a fresh entry, same as re-running an exam.
  useEffect(() => {
    if (savedOnce.current) return;
    if (!vision && !retinal) return; // nothing measured yet, nothing to save
    savedOnce.current = true;
    setSaveState('saving');
    saveScreening(assessment)
      .then(() => {
        return createReferral({
          patient_name: patientName,
          patient_age: null,
          risk_level: riskLevel,
          summary,
          recommendation,
          status: 'pending',
          doctor_name: 'Reviewing ophthalmologist',
          clinic: 'EyeCare referral desk',
          location: 'Remote review',
        }).catch(() => {
          // keep the screening record saved even if the referral queue is unavailable
        });
      })
      .then(() => {
        setSaveState('saved');
        onSaved?.();
      })
      .catch(() => setSaveState('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vision, retinal]);

  const modules = [
    {
      name: t.vision,
      status: vision ? t.complete : t.notRun,
      result: vision ? `OD ${assessment.va_od}, OS ${assessment.va_os}` : t.notCompleted,
      risk: vision ? (factors.find((f) => f.category === 'Acuity' && f.weight > 10) ? t.medium : t.low) : t.low,
      confidence: vision ? 100 : 0,
    },
    {
      name: t.retinal,
      status: retinal ? t.complete : t.notRun,
      result: retinal ? `${retinal.label} (grade ${retinal.grade})` : t.noImage,
      risk: retinal ? (retinal.refer ? t.high : retinal.grade > 0 ? t.medium : t.low) : t.low,
      confidence: retinal ? retinal.confidence : 0,
    },
  ] as const;

  if (!vision && !retinal) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-10 max-md:px-5">
          <PageHeader
            eyebrow={language === 'hi' ? 'व्याख्या' : 'Interpret'}
            title={t.noDataTitle}
            sub={t.noDataSub}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => onNavigate('vision-test')}>
              {t.takeTest}
              <ArrowRight size={15} strokeWidth={2} aria-hidden />
            </Button>
            <Button variant="secondary" onClick={() => onNavigate('retinal')}>
              {t.uploadImage}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-8 py-10 max-md:px-5">
        <PageHeader
          eyebrow={language === 'hi' ? 'व्याख्या' : 'Interpret'}
          title={t.assessTitle}
          sub={t.assessSub}
        />

        {saveState === 'error' && (
          <div className="mb-6">
            <Note tone="caution">
              <span className="inline-flex items-center gap-1.5">
                <AlertTriangle size={13} strokeWidth={2} aria-hidden />
                {t.saveError}
              </span>
            </Note>
          </div>
        )}

        {/* Verdict */}
        <Panel tone="stated" className="p-7 max-md:p-5">
          <div className="flex items-start gap-10 max-md:flex-col max-md:gap-6">
            <div className="shrink-0">
              <Eyebrow className="mb-3">{t.score}</Eyebrow>
              <div
                className="tnum font-mono text-hero font-medium tracking-[-0.02em]"
                style={{ color: tone }}
              >
                {score}
              </div>
              <div className="mt-2">
                <RiskBadge level={riskLevel} size="md" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <Eyebrow className="mb-3">{t.whatToDo}</Eyebrow>
              <div className="text-head font-medium tracking-[-0.01em] text-ink">{recommendation}</div>
              <p className="mt-2.5 text-body leading-relaxed text-ink-2">{summary}</p>
              {conditions.length > 0 && conditions[0] !== 'No significant findings' && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {conditions.map((c) => (
                    <Tag key={c}>{c}</Tag>
                  ))}
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => onNavigate('doctors')}>
                  {t.findSpecialist}
                  <ArrowRight size={15} strokeWidth={2} aria-hidden />
                </Button>
                <Button variant="secondary" onClick={() => onNavigate('report')}>
                  {t.openReport}
                </Button>
              </div>
            </div>
          </div>
        </Panel>

        {/* Factors */}
        <div className="mt-10">
          <SectionRule>{t.moved}</SectionRule>
          <FactorChart factors={factors} language={language} />
        </div>

        {/* Modules */}
        <div className="mt-10">
          <SectionRule>{t.byModule}</SectionRule>
          <table className="w-full">
            <thead>
              <tr className="border-b border-line-soft text-left">
                {[t.module, t.status, t.result, t.conf, t.risk].map((h) => (
                  <th
                    key={h}
                    className="pb-2 font-mono text-micro font-normal tracking-[0.12em] text-ink-4 uppercase last:text-right"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m.name} className="border-b border-line-soft last:border-0">
                  <td className="py-3 pr-4 text-sm whitespace-nowrap text-ink">{m.name}</td>
                  <td className="py-3 pr-4">
                    <span
                      className="font-mono text-micro tracking-widest uppercase"
                      style={{
                        color: m.status === 'Complete' ? 'var(--color-low)' : 'var(--color-ink-4)',
                      }}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-sm text-ink-3">{m.result}</td>
                  <td className="tnum py-3 pr-4 font-mono text-sm text-ink-3">
                    {m.confidence > 0 ? `${m.confidence}%` : '—'}
                  </td>
                  <td className="py-3 text-right">
                    <RiskBadge level={m.risk} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10">
          <Note tone="caution">
            {t.note}
          </Note>
        </div>
      </div>
    </div>
  );
}
