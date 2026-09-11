import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button, Eyebrow, PageHeader } from '../components/ui';

export type DiabetesHistory = 'yes' | 'no' | 'unsure' | 'prefer-not-to-say' | null;
export type DiabetesDuration = 'under-1' | '1-5' | '5-10' | '10-15' | 'over-15' | 'custom' | 'unsure' | null;
export type DiabetesDurationUnit = 'years' | 'months' | null;
export type DiabetesEyeExam = 'yes' | 'no' | 'unsure' | null;

export interface DiabetesProfile {
  diabetes_history: DiabetesHistory;
  diabetes_duration: DiabetesDuration;
  diabetes_duration_value: number | null;
  diabetes_duration_unit: DiabetesDurationUnit;
  recent_diabetic_eye_exam: DiabetesEyeExam;
}

interface DiabetesOnboardingProps {
  onComplete: (profile: DiabetesProfile | null) => void;
  language?: 'en' | 'hi';
}

const historyOptions: Array<{ value: Exclude<DiabetesHistory, null>; label: string }> = [
  { value: 'yes', label: 'Yes, I have diabetes' },
  { value: 'no', label: "No, I don't have diabetes" },
  { value: 'unsure', label: "I'm not sure" },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const durationOptions: Array<{ value: Exclude<DiabetesDuration, null>; label: string }> = [
  { value: 'under-1', label: 'Less than 1 year' },
  { value: '1-5', label: '1–5 years' },
  { value: '5-10', label: '5–10 years' },
  { value: '10-15', label: '10–15 years' },
  { value: 'over-15', label: 'More than 15 years' },
  { value: 'custom', label: 'Enter exact duration' },
  { value: 'unsure', label: "I'm not sure" },
];

const examOptions: Array<{ value: Exclude<DiabetesEyeExam, null>; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: "I'm not sure" },
];

export default function DiabetesOnboarding({ onComplete, language = 'en' }: DiabetesOnboardingProps) {
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState<DiabetesHistory>(null);
  const [duration, setDuration] = useState<DiabetesDuration>(null);
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState<DiabetesDurationUnit>('years');
  const [durationError, setDurationError] = useState('');
  const [exam, setExam] = useState<DiabetesEyeExam>(null);

  const needsDuration = history === 'yes';
  const totalSteps = needsDuration ? 3 : 2;
  const questionStep = needsDuration ? step : step === 1 ? 2 : step;

  const continueStep = () => {
    if (questionStep === 1 && duration === 'custom') {
      const parsed = Number(durationValue);
      if (!durationValue.trim() || !Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        setDurationError('Enter a number from 0 to 100.');
        return;
      }
      setDurationError('');
    }
    if (questionStep < totalSteps - 1) {
      setStep((current) => current + 1);
      return;
    }
    onComplete({
      diabetes_history: history,
      diabetes_duration: needsDuration ? duration : null,
      diabetes_duration_value: needsDuration && duration === 'custom' ? Number(durationValue) : null,
      diabetes_duration_unit: needsDuration && duration === 'custom' ? durationUnit : null,
      recent_diabetic_eye_exam: exam,
    });
  };

  const goBack = () => {
    if (step === 0) return;
    setStep((current) => current - 1);
  };

  const title = language === 'hi' ? 'आपके स्वास्थ्य के बारे में' : 'A little about your health';
  const sub = language === 'hi'
    ? 'कुछ छोटे सवाल आपकी स्क्रीनिंग को आपके लिए बेहतर बनाने में मदद करते हैं।'
    : 'A few short questions help us personalize your eye-health screening.';

  return (
    <div className="flex min-h-full items-center justify-center overflow-y-auto px-5 py-10 md:px-8">
      <div className="w-full max-w-2xl">
        <PageHeader eyebrow="Before we begin" title={title} sub={sub} />

        <div className="mb-8 border-y border-line-soft py-4 text-sm leading-relaxed text-ink-2">
          This information helps us personalize your eye-health screening. It does not diagnose diabetes or diabetic eye disease.
        </div>

        <div className="mb-7 flex items-center justify-between">
          <Eyebrow>Question {questionStep + 1} of {totalSteps}</Eyebrow>
          <span className="font-mono text-micro uppercase tracking-[0.12em] text-ink-4">Optional</span>
        </div>

        {questionStep === 0 && (
          <QuestionBlock title="Do you have a history of diabetes?">
            <OptionList options={historyOptions} value={history} onChange={setHistory} name="diabetes-history" />
          </QuestionBlock>
        )}

        {questionStep === 1 && needsDuration && (
          <QuestionBlock title="How long have you had diabetes?">
            <OptionList options={durationOptions} value={duration} onChange={(value) => { setDuration(value); setDurationError(''); }} name="diabetes-duration" />
            {duration === 'custom' && (
              <div className="mt-5 rounded-panel border border-line-soft bg-panel p-4">
                <label htmlFor="diabetes-duration-value" className="mb-2 block text-body text-ink">
                  How many years have you had diabetes?
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="diabetes-duration-value"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    inputMode="decimal"
                    value={durationValue}
                    onChange={(event) => { setDurationValue(event.target.value); setDurationError(''); }}
                    className="min-w-0 flex-1 rounded-panel border border-line bg-ground px-3 py-2.5 text-body text-ink outline-none focus:border-ink-3"
                    aria-invalid={Boolean(durationError)}
                    aria-describedby={durationError ? 'diabetes-duration-error' : undefined}
                  />
                  <select
                    value={durationUnit ?? 'years'}
                    onChange={(event) => setDurationUnit(event.target.value as Exclude<DiabetesDurationUnit, null>)}
                    aria-label="Duration unit"
                    className="rounded-panel border border-line bg-ground px-3 py-2.5 text-body text-ink outline-none focus:border-ink-3"
                  >
                    <option value="years">Years</option>
                    <option value="months">Months</option>
                  </select>
                </div>
                {durationError && <p id="diabetes-duration-error" className="mt-2 text-sm text-high">{durationError}</p>}
              </div>
            )}
          </QuestionBlock>
        )}

        {questionStep === 2 && (
          <QuestionBlock title="Have you had a recent eye examination for diabetic eye changes?">
            <OptionList options={examOptions} value={exam} onChange={setExam} name="diabetic-eye-exam" />
          </QuestionBlock>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={goBack} disabled={step === 0}>
              <ArrowLeft size={15} strokeWidth={2} aria-hidden />
              Back
            </Button>
            <Button variant="ghost" type="button" onClick={() => onComplete(null)}>
              Skip for now
            </Button>
          </div>
          <Button variant="primary" type="button" onClick={continueStep}>
            {questionStep === totalSteps - 1 ? 'Continue' : 'Continue'}
            <ArrowRight size={15} strokeWidth={2} aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuestionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-labelledby="onboarding-question">
      <h2 id="onboarding-question" className="mb-4 text-head font-medium tracking-[-0.01em] text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function OptionList<T extends string | null>({
  options,
  value,
  onChange,
  name,
}: {
  options: Array<{ value: Exclude<T, null>; label: string }>;
  value: T;
  onChange: (value: Exclude<T, null>) => void;
  name: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={name}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={selected
              ? 'flex cursor-pointer items-center gap-3 rounded-panel border border-ink-4 bg-raised px-4 py-3.5 text-body text-ink'
              : 'flex cursor-pointer items-center gap-3 rounded-panel border border-line-soft px-4 py-3.5 text-body text-ink-2 transition-colors hover:border-line'}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 accent-ink"
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
