import { useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, Upload } from 'lucide-react';
import { Button, Eyebrow, Meter, Note, PageHeader, Row, SectionRule } from '../components/ui';
import { predictImage, type PredictResult } from '../lib/api';

interface RetinalAnalysisProps {
  onNavigate: (page: string) => void;
  onComplete?: (result: PredictResult) => void;
  language?: 'en' | 'hi';
}

type AnalysisPhase = 'upload' | 'analyzing' | 'results' | 'error';
type EyeSelection = 'left' | 'right';

const stages = [
  { label: 'Normalising illumination', at: 25 },
  { label: 'Extracting features', at: 55 },
  { label: 'Classifying', at: 80 },
  { label: 'Mapping model attention', at: 95 },
];

const GRADE_TONE: Record<number, string> = {
  0: 'var(--color-low)',
  1: 'var(--color-low)',
  2: 'var(--color-moderate)',
  3: 'var(--color-high)',
  4: 'var(--color-high)',
};

export default function RetinalAnalysis({ onNavigate, onComplete, language = 'en' }: RetinalAnalysisProps) {
  const t = {
    eyebrow: language === 'hi' ? 'कैप्चर · चरण 3 का 3 · वैकल्पिक' : 'Capture · Step 3 of 3 · Optional',
    title: language === 'hi' ? 'रेटिना इमेजिंग' : 'Retinal imaging',
    sub: language === 'hi' ? 'यदि आपके पास फंडस फोटो पहले से है, तो यह उसे पढ़ लेता है। यदि नहीं है, तो छोड़ दें — वेबकैम ऐसा नहीं कर सकता।' : 'If you already have a fundus photograph, this reads it. If you do not, skip — a webcam cannot take one.',
    drop: language === 'hi' ? 'फंडस इमेज ड्रॉप करें या ब्राउज़ करें' : 'Drop a fundus image, or browse',
    where: language === 'hi' ? 'यह इमेज कहाँ से आती है' : 'Where this image comes from',
    skip: language === 'hi' ? 'छोड़ें — मेरे पास कोई फंडस इमेज नहीं है' : 'Skip — I have no fundus image',
    analyzing: language === 'hi' ? 'विश्लेषण हो रहा है' : 'Analysing',
    failed: language === 'hi' ? 'मॉडल सर्वर से कनेक्ट नहीं हो सका' : 'Could not reach the model server',
    retry: language === 'hi' ? 'फिर से कोशिश करें' : 'Try again',
    attentionOn: language === 'hi' ? 'अटेंशन मैप दिखाएँ' : 'Show attention map',
    attentionOff: language === 'hi' ? 'अटेंशन मैप छिपाएँ' : 'Hide attention map',
    overall: language === 'hi' ? 'कुल मिलाकर' : 'Overall',
    grading: language === 'hi' ? 'ग्रेडिंग स्केल' : 'Grading scale',
    showText: language === 'hi' ? 'अटेंशन मैप चालू करें ताकि पता चले कि परिणाम किस हिस्से ने दिया।' : 'Turn on the attention map to see which parts of the image drove the result.',
    hideText: language === 'hi' ? 'Grad-CAM आउटपुट: गर्म/उच्च रोशनी वाले भाग वही हैं जहाँ मॉडल ने सबसे ज़्यादा ध्यान दिया। यह दिखाता है कि निर्णय कहाँ से आया, यह नहीं कि निर्णय सही था।' : 'Grad-CAM output: brighter/warmer regions are where the model looked hardest. It shows where a decision came from, not that the decision was right.',
    quality: language === 'hi' ? 'इमेज क्वालिटी चेतावनी' : 'Image quality warning',
    dataset: language === 'hi' ? 'डेटा संदर्भ' : 'Dataset reference',
    model: language === 'hi' ? 'मॉडल' : 'Model',
    eye: language === 'hi' ? 'आंख' : 'Eye being analysed',
    leftEye: language === 'hi' ? 'बाईं आंख' : 'Left eye',
    rightEye: language === 'hi' ? 'दाईं आंख' : 'Right eye',
  };
  const [phase, setPhase] = useState<AnalysisPhase>('upload');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eyeSelection, setEyeSelection] = useState<EyeSelection>('right');
  const fileRef = useRef<HTMLInputElement>(null);

  const eyeLabel = eyeSelection === 'left' ? t.leftEye : t.rightEye;

  const validateRetinalUpload = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      return 'This is not an image file. Please upload a retinal fundus image only.';
    }

    if (file.size > 20 * 1024 * 1024) {
      return 'Retinal image is too large. Please upload a fundus image under 20 MB.';
    }

    const dimensions = await new Promise<{ width: number; height: number } | null>((resolve) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      image.src = url;
    });

    if (!dimensions) {
      return 'This image could not be read. Please upload a retinal fundus image only.';
    }

    const minDimension = Math.min(dimensions.width, dimensions.height);
    const maxDimension = Math.max(dimensions.width, dimensions.height);
    const ratio = dimensions.width / dimensions.height;
    if (minDimension < 400 || maxDimension < 600) {
      return 'This image is too small to be a fundus photograph. Please upload a retinal image only.';
    }
    if (ratio < 0.45 || ratio > 2.3) {
      return 'This image does not match the expected retinal photograph shape. Please upload a retinal image only.';
    }

    if (file.name.toLowerCase().includes('selfie') || file.name.toLowerCase().includes('portrait') || file.name.toLowerCase().includes('document') || file.name.toLowerCase().includes('receipt') || file.name.toLowerCase().includes('screenshot')) {
      return 'This looks like a non-retinal image. Please upload a retinal fundus photograph only, not a selfie, document, or screenshot.';
    }

    return null;
  };

  const handleFile = async (file: File) => {
    const validationError = await validateRetinalUpload(file);
    if (validationError) {
      setError(validationError);
      setPhase('error');
      return;
    }

    const imageUrlForPreview = URL.createObjectURL(file);
    setImageUrl(imageUrlForPreview);
    setPhase('analyzing');
    setProgress(0);
    setError(null);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 12 + 4, 96));
    }, 220);

    try {
      const res = await predictImage(file);
      clearInterval(interval);
      setProgress(100);
      setResult(res);
      onComplete?.(res);
      setTimeout(() => setPhase('results'), 300);
    } catch (err) {
      clearInterval(interval);
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message.includes('Model server error')
        ? 'Retinal model could not process this file. Please upload a fundus image only.'
        : message);
      setPhase('error');
    }
  };

  const reset = () => {
    setPhase('upload');
    setImageUrl(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setShowHeatmap(false);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-8 py-10 max-md:px-5">
        <PageHeader
          eyebrow={t.eyebrow}
          title={t.title}
          sub={t.sub}
        />

        {phase === 'upload' && (
          <div className="max-w-xl">
            <div className="mb-5">
              <Eyebrow className="mb-2">{t.eye}</Eyebrow>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['left', t.leftEye],
                  ['right', t.rightEye],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setEyeSelection(value)}
                    aria-pressed={eyeSelection === value}
                    className={eyeSelection === value
                      ? 'rounded-panel border border-ink-3 bg-raised px-3 py-3 text-sm font-medium text-ink'
                      : 'rounded-panel border border-line-soft px-3 py-3 text-sm text-ink transition-colors hover:border-ink-4'}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 1) {
                  setError('Please upload only one retinal fundus image at a time. Multiple files are not allowed.');
                  setPhase('error');
                  return;
                }
                const file = files[0];
                if (file) handleFile(file);
              }}
              onClick={() => fileRef.current?.click()}
              className={
                dragOver
                  ? 'w-full rounded-panel border border-dashed border-ink-3 bg-panel px-6 py-14 text-center transition-colors'
                  : 'w-full rounded-panel border border-dashed border-line bg-ground px-6 py-14 text-center transition-colors hover:border-ink-4 hover:bg-panel'
              }
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple={false}
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length > 1) {
                    setError('Please upload only one retinal fundus image at a time. Multiple files are not allowed.');
                    setPhase('error');
                    return;
                  }
                  if (files[0]) handleFile(files[0]);
                }}
              />
              <Upload size={20} strokeWidth={1.5} className="mx-auto mb-4 text-ink-3" aria-hidden />
              <div className="mb-1.5 text-body text-ink">{t.drop}</div>
              <div className="font-mono text-micro tracking-widest text-ink-4 uppercase">
                JPEG · PNG · TIFF · up to 20 MB
              </div>
            </button>

            <div className="mt-6">
              <Eyebrow className="mb-2">{t.where}</Eyebrow>
              <Note tone="limit">
                A fundus photograph is taken through a dilated pupil by a retinal camera, at an optician or
                eye clinic. Your webcam cannot produce one, and a photo of your eye from a phone is not the
                same thing. If you have had a retinal scan, ask the clinic for the file.
              </Note>
            </div>

            <div className="mt-6">
              <Button variant="secondary" onClick={() => onNavigate('ai-analysis')}>
                {t.skip}
                <ArrowRight size={15} strokeWidth={2} aria-hidden />
              </Button>
            </div>
          </div>
        )}

        {phase === 'analyzing' && imageUrl && (
          <div className="max-w-xl">
            <div className="mb-3 flex items-center justify-between">
              <Eyebrow>{t.eye}</Eyebrow>
              <span className="text-sm font-medium text-ink">{eyeLabel}</span>
            </div>
            <div className="overflow-hidden rounded-panel border border-line bg-black">
              <img
                src={imageUrl}
                alt="Fundus photograph under analysis"
                className="max-h-[280px] w-full object-contain"
              />
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-baseline justify-between">
                <Eyebrow>{t.analyzing}</Eyebrow>
                <span className="tnum font-mono text-body text-ink">{Math.round(progress)}%</span>
              </div>
              <Meter value={progress} tone="var(--color-ink)" />
              <ul className="mt-4">
                {stages.map((s) => {
                  const done = progress > s.at;
                  return (
                    <li
                      key={s.label}
                      className="flex items-center gap-2.5 border-b border-line-soft py-2 last:border-0"
                    >
                      {done ? (
                        <Check size={13} strokeWidth={2.25} className="shrink-0 text-low" aria-hidden />
                      ) : (
                        <span
                          aria-hidden
                          className="h-3.25 w-3.25 shrink-0 rounded-full border border-line"
                        />
                      )}
                      <span className={done ? 'text-sm text-ink' : 'text-sm text-ink-4'}>{s.label}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 font-mono text-micro tracking-widest text-ink-4 uppercase">
                Running EfficientNet-B3 model on-device server
              </p>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="max-w-xl">
            <div className="rounded-panel border border-line bg-panel p-6 text-center">
              <AlertTriangle size={20} strokeWidth={1.5} className="mx-auto mb-3 text-high" aria-hidden />
              <div className="mb-1.5 text-body text-ink">{t.failed}</div>
              <p className="mb-4 text-sm text-ink-3">{error}</p>
              <p className="mb-4 text-sm text-ink-4">
                Make sure the backend is running (<code>uvicorn app:app</code> in the <code>backend/</code>{' '}
                folder) and reachable at the configured API URL.
              </p>
              <Button variant="secondary" onClick={reset}>
                {t.retry}
              </Button>
            </div>
          </div>
        )}

        {phase === 'results' && imageUrl && result && (
          <div className="grid grid-cols-[1fr_300px] gap-8 max-lg:grid-cols-1">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <Eyebrow>{t.eye}</Eyebrow>
                <span className="text-sm font-medium text-ink">{eyeLabel}</span>
              </div>
              <div className="relative overflow-hidden rounded-panel border border-line bg-black">
                <img
                  src={showHeatmap ? result.heatmap : imageUrl}
                  alt={showHeatmap ? 'Model attention heatmap' : 'Analysed fundus photograph'}
                  className="block max-h-[340px] w-full object-contain"
                />
                <button
                  onClick={() => setShowHeatmap((h) => !h)}
                  className="absolute top-3 right-3 rounded border border-line bg-ground/85 px-2.5 py-1 font-mono text-micro tracking-widest text-ink-2 uppercase backdrop-blur-sm transition-colors hover:text-ink"
                >
                  {showHeatmap ? t.attentionOff : t.attentionOn}
                </button>
              </div>
              <p className="mt-3 text-sm text-ink-3">
                {showHeatmap ? t.hideText : t.showText}
              </p>
            </div>

            <div>
              <SectionRule>{t.overall}</SectionRule>
              <div className="mb-8 border-b border-line-soft pb-5">
                <div
                  className="text-head font-medium"
                  style={{ color: GRADE_TONE[result.grade] }}
                >
                  {result.label}
                </div>
                <div className="tnum mt-1.5 font-mono text-sm text-ink-3">
                  {result.confidence}% confidence ({result.confidence_label}) · severity score {result.severity}
                </div>
                <p className="mt-2 text-sm text-ink-2">{result.description}</p>
              </div>

              {!result.quality.is_good && (
                <div className="mb-6">
                  <Note tone="caution">
                    <strong>{t.quality}:</strong> {result.quality.reason}
                  </Note>
                </div>
              )}

              <SectionRule>{t.grading}</SectionRule>
              <div className="mb-8">
                <Row label="DR grade">
                  {result.grade} — {result.label}
                </Row>
                <Row label="Referral recommended">{result.refer ? 'Yes' : 'No'}</Row>
                <Row label="Confidence">{result.confidence_label} ({result.confidence}%)</Row>
                <Row label="Image quality">{result.quality.status === 'good' ? 'Good' : 'Poor'}</Row>
                <Row label="Lesion estimate">{result.lesions.count} candidate spots</Row>
                <Row label={t.dataset}>{result.dataset ?? 'IDRiD reference + APTOS 2019'}</Row>
                <Row label={t.model}>{result.model_family ?? 'EfficientNet-B3'}</Row>
                <Row label={t.grading}>{result.grade_explanation ?? '0 = No DR, 1 = Mild, 2 = Moderate, 3 = Severe, 4 = Proliferative'}</Row>
                {result.metrics?.aptos_kappa != null && (
                  <Row label="Validation kappa">{Number(result.metrics.aptos_kappa).toFixed(3)}</Row>
                )}
                {result.metrics?.sensitivity != null && (
                  <Row label="Model sensitivity">
                    {(Number(result.metrics.sensitivity) * 100).toFixed(0)}%
                  </Row>
                )}
              </div>

              {result.clinical_flags?.length > 0 && (
                <div className="mb-8">
                  <SectionRule>Clinical checks</SectionRule>
                  <ul className="space-y-2">
                    {result.clinical_flags.map((flag) => (
                      <li key={flag} className="rounded border border-line-soft bg-ground px-3 py-2 text-sm text-ink-2">
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.refer && (
                <div className="mb-8">
                  <Note tone="caution">
                    This image shows signs consistent with referable diabetic retinopathy. Please consult
                    an eye-care professional for confirmation.
                  </Note>
                </div>
              )}

              <Button variant="primary" onClick={() => onNavigate('ai-analysis')} className="w-full">
                Continue to assessment
                <ArrowRight size={15} strokeWidth={2} aria-hidden />
              </Button>
              <button onClick={reset} className="mt-3 w-full text-center text-sm text-ink-3 hover:text-ink">
                Analyse another image
              </button>
              <p className="mt-4 text-sm text-ink-4">
                Assisted screening only, run on a real trained model. Not a diagnosis, and not a substitute
                for a clinician reading the same image.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
