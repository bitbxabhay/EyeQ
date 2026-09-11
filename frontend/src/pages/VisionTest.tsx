import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Camera, Eye, Grid3X3, Palette, Scan, X } from 'lucide-react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Button, Eyebrow, Note, PageHeader, Row, SectionRule } from '../components/ui';
import { formatAcuity, referralCategory, snellenRows, type Notation } from '../data/mockData';

interface VisionTestProps {
  onNavigate: (page: string) => void;
  onComplete?: (result: { od: number; os: number; notation: Notation; chartMode: ChartMode; colorVision?: { correct: number; total: number; unanswered: number; result: string } }) => void;
  language?: 'en' | 'hi';
}

type TestPhase = 'calibrate' | 'testing' | 'complete';
type Eye = 'OD' | 'OS';
type ChartMode = 'distance' | 'near' | 'amsler' | 'peripheral' | 'color';
type Direction = 'up' | 'right' | 'down' | 'left';
type AmslerFinding = 'normal' | 'distorted' | 'missing' | null;

const COLOR_PLATES = [
  { src: '/color-plates/plate-01.svg', number: '12' },
  { src: '/color-plates/plate-02.svg', number: '8' },
  { src: '/color-plates/plate-03.svg', number: '29' },
  { src: '/color-plates/plate-04.svg', number: '5' },
  { src: '/color-plates/plate-05.svg', number: '74' },
  { src: '/color-plates/plate-06.svg', number: '6' },
  { src: '/color-plates/plate-07.svg', number: '15' },
  { src: '/color-plates/plate-08.svg', number: '45' },
  { src: '/color-plates/plate-09.svg', number: '73' },
  { src: '/color-plates/plate-10.svg', number: '26' },
];

const AMSLER_FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const PERIPHERAL_TARGETS = [
  { x: 50, y: 18, label: 'upper centre' },
  { x: 82, y: 30, label: 'upper right' },
  { x: 86, y: 68, label: 'lower right' },
  { x: 50, y: 84, label: 'lower centre' },
  { x: 14, y: 68, label: 'lower left' },
  { x: 18, y: 30, label: 'upper left' },
];

const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left'];
const DIRECTION_ROTATION: Record<Direction, 0 | 90 | 180 | 270> = {
  right: 0,
  down: 90,
  left: 180,
  up: 270,
};
const DIRECTION_ICON = { up: ArrowUp, right: ArrowRight, down: ArrowDown, left: ArrowLeft };

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const preparation = [
  'Cover the eye you are not testing with your palm, not your fingers',
  'Cover one eye without pressing on it',
  'Read the smallest line you can see clearly',
  'Guess if you are unsure — a guess is data too',
  'Repeat with the other eye',
  'This is a screening estimate, not a diagnosis or prescription',
];

export default function VisionTest({ onNavigate, onComplete, language = 'en' }: VisionTestProps) {
  const t = {
    pageEyebrow: language === 'hi' ? 'कैप्चर · चरण 2 का 3' : 'Capture · Step 2 of 3',
    title: language === 'hi' ? 'दृष्टि परीक्षण' : 'Acuity test',
    sub: language === 'hi' ? 'स्क्रीन का आकार तभी अर्थ रखता है जब स्क्रीन की दूरी माप ली जाए। तीन उत्तर और परीक्षण पूरा हो जाता है।' : 'Letter size on screen only means something once the screen is measured. Three answers and you are set.',
    chart: language === 'hi' ? 'चार्ट' : 'Chart',
    defaultNote: language === 'hi' ? 'यह दूरी दृश्य तीक्ष्णता स्क्रीनिंग दूर की वस्तुओं को देखने में संभावित कठिनाई को फ्लैग कर सकती है।' : 'This distance-vision screening can flag possible difficulty seeing distant objects; it does not diagnose myopia.',
    notation: language === 'hi' ? 'संकेतन' : 'Notation',
    before: language === 'hi' ? 'शुरू करने से पहले' : 'Before you start',
    start: language === 'hi' ? 'दाएँ आँख से शुरू करें' : 'Start with the right eye',
    reading: language === 'hi' ? 'पढ़ना' : 'Reading',
    skip: language === 'hi' ? 'परीक्षण छोड़ें' : 'Skip the test',
    both: language === 'hi' ? 'दोनों आँखें खुली, एक ढकी हुई' : 'Both eyes open, one covered',
    question: language === 'hi' ? 'यह किस दिशा में खुलता है?' : 'Which way does it open?',
    letterQuestion: language === 'hi' ? 'यह अक्षर कौन सा है?' : 'Which letter is that?',
    complete: language === 'hi' ? 'कैप्चर · चरण 2 पूरा' : 'Capture · Step 2 complete',
    resultTitle: language === 'hi' ? 'दृष्टि परिणाम' : 'Acuity results',
    continue: language === 'hi' ? 'जारी रखें' : 'Continue',
    skipAss: language === 'hi' ? 'मूल्यांकन पर जाएँ' : 'Skip to assessment',
    line: language === 'hi' ? 'লাইন' : 'Line',
    cover: language === 'hi' ? 'अपनी {eye} आँख ढकें' : 'Cover your {eye} eye',
  };
  const [phase, setPhase] = useState<TestPhase>('calibrate');
  const [chartMode, setChartMode] = useState<ChartMode>('distance');
  const [notation, setNotation] = useState<Notation>('metric');
  const [eye, setEye] = useState<Eye>('OD');
  const [rowIndex, setRowIndex] = useState(0);
  const [letterIndex, setLetterIndex] = useState(0);
  const [results, setResults] = useState<{ OD: number; OS: number }>({ OD: 200, OS: 200 });
  const [screenInches, setScreenInches] = useState(15);
  const [answered, setAnswered] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [amslerFinding, setAmslerFinding] = useState<AmslerFinding>(null);
  const amslerVideoRef = useRef<HTMLVideoElement>(null);
  const amslerLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const amslerStreamRef = useRef<MediaStream | null>(null);
  const [amslerCamera, setAmslerCamera] = useState<'off' | 'starting' | 'ready' | 'too-close' | 'blocked'>('off');
  const [amslerDistance, setAmslerDistance] = useState<number | null>(null);
  const [peripheralIndex, setPeripheralIndex] = useState(0);
  const [peripheralVisible, setPeripheralVisible] = useState(false);
  const [peripheralResponse, setPeripheralResponse] = useState<boolean | null>(null);
  const [colorPlateIndex, setColorPlateIndex] = useState(0);
  const [colorAnswer, setColorAnswer] = useState('');
  const [colorAnswers, setColorAnswers] = useState<Record<number, string>>({});
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<'off' | 'starting' | 'ready' | 'blocked'>('off');
  const distanceVideoRef = useRef<HTMLVideoElement>(null);
  const distanceStreamRef = useRef<MediaStream | null>(null);
  const [viewingDistance, setViewingDistance] = useState('3');
  const [distanceConfirmed, setDistanceConfirmed] = useState(false);
  const [nearBothEyes, setNearBothEyes] = useState(false);
  const [nearBothActive, setNearBothActive] = useState(false);
  const nearTarget = useMemo(() => DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)], [eye, rowIndex, nearBothActive]);

  const currentRow = snellenRows[rowIndex];
  const currentLetter = currentRow.letters[letterIndex];

  // Memoised on the position in the test. Without this the target rerolls on
  // every render, so it changes between reading it and answering.
  const target = currentLetter;

  const options = useMemo(
    () => shuffle([currentLetter, ...shuffle(['E', 'F', 'P', 'T', 'O', 'Z', 'L', 'D', 'C'].filter((l) => l !== currentLetter)).slice(0, 3)]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eye, rowIndex, letterIndex],
  );

  const finishEye = (acuity: number) => {
    const next = { ...results, [eye]: acuity };
    setResults(next);
    if (eye === 'OD') {
      setEye('OS');
      setRowIndex(0);
      setLetterIndex(0);
    } else {
      setPhase('complete');
      onComplete?.({ od: next.OD, os: next.OS, notation, chartMode });
    }
  };

  const finishNearEye = (acuity: number) => {
    const next = { ...results, [eye]: acuity };
    setResults(next);
    setRowIndex(0);
    if (eye === 'OD') {
      setEye('OS');
    } else if (nearBothEyes && !nearBothActive) {
      setNearBothActive(true);
    } else {
      setPhase('complete');
      onComplete?.({ od: next.OD, os: next.OS, notation, chartMode: 'near' });
    }
  };

  const handleNearAnswer = (answer: Direction) => {
    if (answered || amslerCamera !== 'ready') return;
    setAnswered(answer);
    const correct = answer === nearTarget;
    setFeedback(correct ? 'correct' : 'wrong');
    window.setTimeout(() => {
      setAnswered(null);
      setFeedback(null);
      if (correct && rowIndex < snellenRows.length - 1) setRowIndex((index) => index + 1);
      else finishNearEye(snellenRows[rowIndex].acuity);
    }, 450);
  };

  const finishAmslerEye = (finding: Exclude<AmslerFinding, null>) => {
    setAmslerFinding(finding);
    if (eye === 'OD') {
      setEye('OS');
      return;
    }
    setPhase('complete');
    onComplete?.({ od: 200, os: 200, notation, chartMode });
  };

  const finishColorTest = (answers: Record<number, string>) => {
    const correct = COLOR_PLATES.reduce(
      (total, plate, index) => total + (answers[index] === plate.number ? 1 : 0),
      0,
    );
    const unanswered = COLOR_PLATES.filter((_, index) => !answers[index]).length;
    const result = unanswered > 0
      ? 'Inconclusive — consider repeating the test'
      : correct >= 8
        ? 'No obvious colour-vision deficiency detected'
        : 'Possible colour-vision deficiency';
    setPhase('complete');
    onComplete?.({
      od: 200,
      os: 200,
      notation,
      chartMode: 'color',
      colorVision: { correct, total: COLOR_PLATES.length, unanswered, result },
    });
  };

  const submitColorAnswer = (allowBlank = false) => {
    if (!allowBlank && !colorAnswer.trim()) return;
    const nextAnswers = { ...colorAnswers, [colorPlateIndex]: colorAnswer.trim() };
    setColorAnswers(nextAnswers);
    if (colorPlateIndex < COLOR_PLATES.length - 1) {
      setColorPlateIndex((index) => index + 1);
      setColorAnswer(colorAnswers[colorPlateIndex + 1] ?? '');
    } else {
      finishColorTest(nextAnswers);
    }
  };

  const stopDistanceCamera = () => {
    distanceStreamRef.current?.getTracks().forEach((track) => track.stop());
    distanceStreamRef.current = null;
    if (distanceVideoRef.current) distanceVideoRef.current.srcObject = null;
    setCameraOpen(false);
    setCameraStatus('off');
  };

  useEffect(() => {
    if (!cameraOpen) return;
    let cancelled = false;
    const open = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus('blocked');
        return;
      }
      setCameraStatus('starting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        distanceStreamRef.current = stream;
        if (distanceVideoRef.current) {
          distanceVideoRef.current.srcObject = stream;
          await distanceVideoRef.current.play();
        }
        setCameraStatus('ready');
      } catch {
        setCameraStatus('blocked');
      }
    };
    open();
    return () => {
      cancelled = true;
      distanceStreamRef.current?.getTracks().forEach((track) => track.stop());
      distanceStreamRef.current = null;
    };
  }, [cameraOpen]);

  useEffect(() => () => {
    distanceStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (phase !== 'testing' || (chartMode !== 'amsler' && chartMode !== 'peripheral' && chartMode !== 'near')) return;

    let cancelled = false;
    let animationFrame = 0;
    const startAmslerCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setAmslerCamera('blocked');
        return;
      }
      setAmslerCamera('starting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        amslerStreamRef.current = stream;
        const video = amslerVideoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
        );
        amslerLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: AMSLER_FACE_MODEL_URL },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.2,
          minFacePresenceConfidence: 0.2,
        });

        const measure = () => {
          if (cancelled || !video.videoWidth || !amslerLandmarkerRef.current) return;
          const result = amslerLandmarkerRef.current.detectForVideo(video, performance.now());
          const landmarks = result.faceLandmarks?.[0];
          if (landmarks?.length) {
            const xs = landmarks.map((point) => point.x);
            const faceRatio = Math.max(...xs) - Math.min(...xs);
            const distanceCm = faceRatio > 0 ? Math.round(12 / faceRatio) : null;
            setAmslerDistance(distanceCm);
            setAmslerCamera(distanceCm !== null && distanceCm >= 40 ? 'ready' : 'too-close');
          } else {
            setAmslerDistance(null);
            setAmslerCamera('starting');
          }
          animationFrame = requestAnimationFrame(measure);
        };
        measure();
      } catch {
        setAmslerCamera('blocked');
      }
    };
    startAmslerCamera();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      amslerStreamRef.current?.getTracks().forEach((track) => track.stop());
      amslerStreamRef.current = null;
      amslerLandmarkerRef.current?.close();
      amslerLandmarkerRef.current = null;
    };
  }, [chartMode, phase]);

  useEffect(() => {
    if (phase !== 'testing' || chartMode !== 'peripheral' || amslerCamera !== 'ready') return;
    setPeripheralVisible(true);
    setPeripheralResponse(null);
    const timer = window.setTimeout(() => setPeripheralVisible(false), 1600);
    return () => window.clearTimeout(timer);
  }, [amslerCamera, chartMode, peripheralIndex, phase]);

  const handleAnswer = (answer: string) => {
    if (answered) return;
    setAnswered(answer);
    const isCorrect = answer === target;
    setFeedback(isCorrect ? 'correct' : 'wrong');

    setTimeout(() => {
      setAnswered(null);
      setFeedback(null);

      if (letterIndex < currentRow.letters.length - 1) {
        setLetterIndex((li) => li + 1);
      } else if (isCorrect && rowIndex < snellenRows.length - 1) {
        setRowIndex((ri) => ri + 1);
        setLetterIndex(0);
      } else {
        finishEye(currentRow.acuity);
      }
    }, 550);
  };

  /* ------------------------------------------------------------ calibrate */

  if (phase === 'calibrate') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-10 max-md:px-5">
          <PageHeader
            eyebrow={t.pageEyebrow}
            title={t.title}
            sub={t.sub}
          />

          <SectionRule>{t.chart}</SectionRule>
          <div className="mb-3 grid grid-cols-5 gap-3 max-xl:grid-cols-3 max-sm:grid-cols-1">
            {(
              [
                {
                  id: 'distance' as const,
                  name: 'Distance Vision',
                  desc: 'Read the letters from a controlled distance to check your distance visual acuity.',
                  icon: Eye,
                },
                {
                  id: 'near' as const,
                  name: 'Near Tumbling E',
                  desc: 'At 40 cm, identify the direction of progressively smaller E symbols to screen near vision.',
                  icon: BookOpen,
                },
                {
                  id: 'amsler' as const,
                  name: 'Amsler grid',
                  desc: 'A 20 × 20 grid for checking missing, wavy, or distorted lines at 40 cm.',
                  icon: Grid3X3,
                },
                {
                  id: 'peripheral' as const,
                  name: 'Peripheral vision',
                  desc: 'A centre fixation dot with brief 5 mm targets at different angles and distances.',
                  icon: Scan,
                },
                {
                  id: 'color' as const,
                  name: 'Color blindness',
                  desc: 'Several Ishihara-style color plates. Enter the number you see in each plate.',
                  icon: Palette,
                },
              ]
            ).map((c) => {
              const active = chartMode === c.id;
              const ChartIcon = c.icon;
              return (
                <button
                  key={c.id}
                  onClick={() => setChartMode(c.id)}
                  aria-pressed={active}
                  className={
                    active
                      ? 'group relative aspect-square overflow-hidden rounded-panel border border-ink-3 bg-raised p-3.5 text-left shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-colors'
                      : 'group relative aspect-square overflow-hidden rounded-panel border border-line-soft bg-panel/40 p-3.5 text-left transition-colors hover:border-ink-4 hover:bg-panel'
                  }
                >
                  {active && <span className="absolute inset-x-0 top-0 h-0.5 bg-ink" aria-hidden />}
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <span className={active ? 'flex h-10 w-10 items-center justify-center rounded-full bg-ink text-ground' : 'flex h-10 w-10 items-center justify-center rounded-full border border-line bg-raised text-ink-2 transition-colors group-hover:border-ink-4 group-hover:text-ink'}>
                      <ChartIcon size={19} strokeWidth={1.8} aria-hidden />
                    </span>
                    <span className="tnum font-mono text-micro text-ink-4">0{['distance', 'near', 'amsler', 'peripheral', 'color'].indexOf(c.id) + 1}</span>
                  </div>
                  <div className="mb-2 min-h-9">
                    <span className={active ? 'text-body font-semibold text-ink' : 'text-body font-medium text-ink transition-colors group-hover:text-ink'}>
                      {c.name}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-ink">{c.desc}</p>
                </button>
              );
            })}
          </div>
          <p className="mb-9 text-sm text-ink">
            {chartMode === 'near'
              ? 'Sit 40 cm (16 inches) from the camera/device. The camera guides positioning but does not measure distance accurately.'
              : chartMode === 'amsler'
              ? 'The Amsler grid must be viewed at 40 cm. Keep one eye covered and stare at the centre dot.'
              : chartMode === 'peripheral'
                ? 'Keep both eyes open, stare at the centre fixation dot, and report whether you saw each brief target without looking toward it.'
                : chartMode === 'color'
                  ? 'Color plates are shown one at a time. Enter the number you can see in each plate.'
                : t.defaultNote}
          </p>

          <SectionRule>{t.notation}</SectionRule>
          <div className="mb-9 flex gap-2">
            {(
              [
                { id: 'metric' as const, label: '6/6', sub: 'Metric — India, UK' },
                { id: 'imperial' as const, label: '20/20', sub: 'Imperial — US' },
              ]
            ).map((n) => (
              <button
                key={n.id}
                onClick={() => setNotation(n.id)}
                aria-pressed={notation === n.id}
                className={
                  notation === n.id
                    ? 'flex-1 rounded-panel border border-ink-4 bg-raised px-4 py-3 text-left transition-colors'
                    : 'flex-1 rounded-panel border border-line-soft px-4 py-3 text-left transition-colors hover:border-line'
                }
              >
                <div className="tnum font-mono text-head text-ink">{n.label}</div>
                <div className="mt-0.5 text-micro text-ink-3">{n.sub}</div>
              </button>
            ))}
          </div>

          <SectionRule>Calibration</SectionRule>
          <div className="mb-4">
            <div className="mb-3 flex items-baseline justify-between">
              <label htmlFor="screen-size" className="text-body text-ink">
                Screen size, corner to corner
              </label>
              <span className="tnum font-mono text-head text-ink">{screenInches}&Prime;</span>
            </div>
            <input
              id="screen-size"
              type="range"
              min={11}
              max={34}
              value={screenInches}
              onChange={(e) => setScreenInches(Number(e.target.value))}
              className="w-full accent-ink"
            />
            <div className="mt-1 flex justify-between font-mono text-micro text-ink-4">
              <span>11&Prime;</span>
              <span>34&Prime;</span>
            </div>
          </div>

          <div className="border-y border-line-soft py-5">
            <Eyebrow className="mb-2">{language === 'hi' ? 'इस दूरी पर बैठें' : 'Sit at'}</Eyebrow>
            <div className="tnum font-mono text-title text-ink">{chartMode === 'amsler' || chartMode === 'peripheral' || chartMode === 'color' || chartMode === 'near' ? '40 cm' : '3 metres'}</div>
            <p className="mt-1.5 text-sm text-ink-3">
              {chartMode === 'near'
                ? 'Keep your face in the camera guide. Continue only when the distance check accepts approximately 40 cm.'
                : chartMode === 'distance'
                ? 'Place your device/screen at the recommended distance before starting the test.'
                : chartMode === 'amsler' || chartMode === 'peripheral' || chartMode === 'color'
                ? chartMode === 'color'
                  ? 'Use a comfortable reading distance and keep the plate evenly lit.'
                  : 'The webcam will not allow this test when you are closer than 40 cm.'
                : 'About an arm\'s length for a laptop. Stay there for the whole test — moving changes the result.'}
            </p>
          </div>

          <div className="mt-10">
            <SectionRule>{t.before}</SectionRule>
            <ol>
              {preparation.map((p, i) => (
                <li
                  key={p}
                  className="flex gap-4 border-b border-line-soft py-2.5 text-body text-ink-2 last:border-0"
                >
                  <span aria-hidden className="tnum font-mono text-sm text-ink-4">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {p}
                </li>
              ))}
            </ol>
          </div>

          {chartMode === 'distance' && (
            <div className="mt-8 rounded-panel border border-line-soft bg-panel p-5">
              <Eyebrow className="mb-2">Set your viewing distance</Eyebrow>
              <p className="text-sm leading-relaxed text-ink-2">Recommended testing distance: 3 metres. The camera is a positioning aid only and does not measure distance or save footage.</p>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="min-w-[180px] flex-1 text-sm text-ink-2">
                  Enter viewing distance manually
                  <span className="mt-1 flex items-center gap-2">
                    <input type="number" min="0" max="100" step="0.1" value={viewingDistance} onChange={(event) => { setViewingDistance(event.target.value); setDistanceConfirmed(false); }} className="w-full rounded-panel border border-line bg-ground px-3 py-2.5 text-body text-ink outline-none focus:border-ink-3" aria-label="Viewing distance in metres" />
                    <span className="shrink-0 text-sm text-ink-3">metres</span>
                  </span>
                </label>
                <Button variant="secondary" type="button" onClick={() => { setDistanceConfirmed(true); }}>
                  Confirm distance
                </Button>
                <Button variant="ghost" type="button" onClick={() => setCameraOpen(true)}>
                  <Camera size={15} strokeWidth={2} aria-hidden />
                  Measure distance with camera
                </Button>
              </div>
              {Number(viewingDistance) > 0 && Math.abs(Number(viewingDistance) - 3) > 0.75 && <p className="mt-3 text-sm text-moderate">This is substantially different from the recommended 3 metres. The result may be less comparable.</p>}
              {distanceConfirmed && <p className="mt-3 text-sm text-low">Manual distance confirmed at approximately {viewingDistance} metres.</p>}
              {cameraOpen && (
                <div className="mt-5 border-t border-line-soft pt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Eyebrow>Camera positioning aid</Eyebrow>
                    <Button variant="ghost" type="button" onClick={stopDistanceCamera}>
                      <X size={15} strokeWidth={2} aria-hidden />
                      Close camera
                    </Button>
                  </div>
                  <div className="relative aspect-video overflow-hidden rounded-panel border border-line bg-ground">
                    <video ref={distanceVideoRef} className="h-full w-full object-cover" style={{ transform: 'scaleX(-1)' }} muted playsInline aria-label="Local camera positioning preview" />
                    <div className="pointer-events-none absolute inset-[18%] rounded-panel border border-white/75" aria-hidden="true" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-sm text-white drop-shadow">Centre your upper body in the guide and sit about 3 metres away.</div>
                    {cameraStatus === 'starting' && <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm text-white">Starting camera…</div>}
                    {cameraStatus === 'blocked' && <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-6 text-center text-sm text-white">Camera permission required. Use manual distance instead.</div>}
                  </div>
                  <p className="mt-3 text-sm text-ink-3">Camera frames stay in this browser and are never uploaded, stored, or used as biometric data. This preview cannot accurately measure distance.</p>
                  <Button variant="secondary" type="button" className="mt-3" onClick={() => { setViewingDistance('3'); setDistanceConfirmed(true); stopDistanceCamera(); }} disabled={cameraStatus !== 'ready'}>
                    Confirm approximately 3 metres
                  </Button>
                  <Button variant="ghost" type="button" className="mt-3 ml-2" onClick={stopDistanceCamera}>Use manual distance instead</Button>
                </div>
              )}
            </div>
          )}

          {chartMode === 'near' && (
            <div className="mt-8 rounded-panel border border-line-soft bg-panel p-5">
              <Eyebrow className="mb-2">Near-vision setup</Eyebrow>
              <p className="text-sm leading-relaxed text-ink-2">Recommended distance: 40 cm (16 inches). Use the camera as a positioning guide only; no camera frames are uploaded or stored.</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button variant="secondary" type="button" onClick={() => setPhase('testing')}>
                  <Camera size={15} strokeWidth={2} aria-hidden />
                  Check 40 cm with camera
                </Button>
                <label className="flex items-center gap-2 text-sm text-ink-2">
                  <input type="checkbox" checked={nearBothEyes} onChange={(event) => setNearBothEyes(event.target.checked)} className="h-4 w-4 accent-ink" />
                  Optionally test with both eyes
                </label>
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm text-ink-3">
                <span>{amslerCamera === 'ready' ? 'Distance accepted at approximately 40 cm.' : 'Camera distance check required before starting.'}</span>
              </div>
            </div>
          )}

          <div className="mt-8">
            <Button variant="primary" onClick={() => setPhase('testing')} disabled={chartMode === 'distance' && !distanceConfirmed}>
              {t.start}
              <ArrowRight size={15} strokeWidth={2} aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------- complete */

  if (phase === 'complete') {
    const worst = Math.max(results.OD, results.OS);
    const better = Math.min(results.OD, results.OS);
    const category = referralCategory(better);
    const colorCorrect = COLOR_PLATES.reduce(
      (total, plate, index) => total + (colorAnswers[index] === plate.number ? 1 : 0),
      0,
    );
    const colorUnanswered = COLOR_PLATES.filter((_, index) => !colorAnswers[index]).length;
    const colorResult = colorUnanswered > 0
      ? 'Inconclusive — consider repeating the test'
      : colorCorrect >= 8
        ? 'No obvious colour-vision deficiency detected'
        : 'Possible colour-vision deficiency';

    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-10 max-md:px-5">
          <PageHeader eyebrow={t.complete} title={t.resultTitle} />

          <div className="grid grid-cols-2 divide-x divide-line-soft border-y border-line-soft">
            {[
              { va: formatAcuity(results.OD, notation), label: 'OD', sub: 'Right eye' },
              { va: formatAcuity(results.OS, notation), label: 'OS', sub: 'Left eye' },
            ].map((r, i) => (
              <div key={r.label} className={i === 0 ? 'py-7 pr-6' : 'py-7 pr-6 pl-6'}>
                <Eyebrow className="mb-2">
                  {r.label} · {r.sub}
                </Eyebrow>
                <div className="tnum font-mono text-hero font-medium tracking-[-0.02em] text-ink">
                  {r.va}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <SectionRule>{t.reading}</SectionRule>
            <Row label="Presenting vision, better eye">
              <span
                style={{
                  color: category.refer ? 'var(--color-moderate)' : 'var(--color-low)',
                }}
              >
                {category.label}
              </span>
            </Row>
            <Row label="Referral indicated">
              <span style={{ color: category.refer ? 'var(--color-moderate)' : 'var(--color-low)' }}>
                {category.refer ? 'Yes — refraction needed' : 'No'}
              </span>
            </Row>
            <Row label="Chart used">
              {chartMode === 'distance' ? 'Distance Vision' : chartMode === 'near' ? 'Near Tumbling E' : chartMode === 'amsler' ? 'Amsler grid' : chartMode === 'peripheral' ? 'Peripheral vision' : 'Color blindness'}
            </Row>
            {chartMode === 'color' && (
              <div className="col-span-2 mt-4 rounded-panel border border-line-soft bg-raised p-5">
                <Eyebrow className="mb-2">Colour vision screening</Eyebrow>
                <Row label="Score">
                  <span className="tnum font-mono">{colorCorrect}/{COLOR_PLATES.length} correct</span>
                </Row>
                <Row label="Result">
                  <span style={{ color: colorResult.startsWith('No obvious') ? 'var(--color-low)' : 'var(--color-moderate)' }}>
                    {colorResult}
                  </span>
                </Row>
                {colorResult !== 'No obvious colour-vision deficiency detected' && (
                  <p className="mt-4 text-sm leading-relaxed text-ink-2">
                    Consider repeating this screening under even lighting. If the result remains suggestive, consult an eye-care professional for a complete colour-vision assessment.
                  </p>
                )}
              </div>
            )}
            {chartMode === 'near' && (
              <div className="col-span-2 mt-4 rounded-panel border border-line-soft bg-raised p-5">
                <Eyebrow className="mb-2">Near-vision screening</Eyebrow>
                <Row label="Right eye">{formatAcuity(results.OD, notation)}</Row>
                <Row label="Left eye">{formatAcuity(results.OS, notation)}</Row>
                <Row label="Screening result">
                  <span style={{ color: Math.max(results.OD, results.OS) > 40 ? 'var(--color-moderate)' : 'var(--color-low)' }}>
                    {Math.max(results.OD, results.OS) > 40 ? 'Needs Eye Examination' : Math.max(results.OD, results.OS) > 20 ? 'Possible Reduced Near Vision' : 'Normal'}
                  </span>
                </Row>
                {Math.max(results.OD, results.OS) > 20 && (
                  <p className="mt-4 text-sm leading-relaxed text-ink-2">
                    This is a screening result, not a medical diagnosis. Consider a professional eye examination for confirmation.
                  </p>
                )}
              </div>
            )}
            <Row label="Measured at">
              <span className="tnum font-mono">
                {chartMode === 'distance' ? `${viewingDistance} m · ${screenInches}&Prime; screen` : `${screenInches}&Prime; · ${Math.round(screenInches * 3.5)} cm`}
              </span>
            </Row>
            {chartMode === 'distance' && Math.max(results.OD, results.OS) > 20 && (
              <div className="mt-5">
                <Note tone="caution">
                  Your result suggests reduced distance visual acuity. This can occur with myopia or other vision conditions. Consider getting a comprehensive eye examination.
                </Note>
              </div>
            )}
          </div>

          {category.refer && (
            <div className="mt-8">
              <Note tone="caution">
                Presenting vision below {formatAcuity(40, notation)} in the better eye is the threshold vision
                camps refer on. Most of what falls into this band is uncorrected refractive error — correctable
                with a pair of glasses, once someone measures it properly.
              </Note>
            </div>
          )}

          <div className="mt-8">
            <Note tone="limit">
              This is an estimate, not a refraction. Ambient light, screen calibration and how well you kept
              your distance all move the number. Worst eye recorded at {formatAcuity(worst, notation)}.
            </Note>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => onNavigate('retinal')}>
              {t.continue}
              <ArrowRight size={15} strokeWidth={2} aria-hidden />
            </Button>
            <Button variant="ghost" onClick={() => onNavigate('ai-analysis')}>
              {t.skipAss}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- testing */

  const progress = ((rowIndex / snellenRows.length) * 0.5 + (eye === 'OS' ? 0.5 : 0)) * 100;

  if (chartMode === 'near') {
    const nearEyeLabel = nearBothActive ? 'Both eyes' : eye === 'OD' ? 'Right eye · OD' : 'Left eye · OS';
    const NearIcon = DIRECTION_ICON[nearTarget];
    return (
      <div className="flex h-full flex-col overflow-y-auto px-8 py-8 max-md:px-5">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <div className="mb-6 flex items-start justify-between gap-6">
            <div>
              <Eyebrow className="mb-1.5">{nearEyeLabel} · Near Tumbling E · line {rowIndex + 1} of {snellenRows.length}</Eyebrow>
              <h1 className="text-head font-semibold text-ink">Cover one eye and choose the E direction</h1>
            </div>
            <div className="tnum shrink-0 font-mono text-head text-ink">40 cm</div>
          </div>

          <div className="mb-6 flex items-center gap-4 rounded-panel border border-line bg-panel p-3">
            <video ref={amslerVideoRef} className="h-20 w-28 rounded border border-line-soft object-cover" style={{ transform: 'scaleX(-1)' }} muted playsInline aria-label="Near-test camera distance preview" />
            <div className="min-w-0">
              <Eyebrow className="mb-1">Camera distance guide</Eyebrow>
              <p className="text-sm text-ink-2">
                {amslerCamera === 'ready'
                  ? 'Distance accepted at approximately 40 cm.'
                  : amslerCamera === 'blocked'
                    ? 'Camera permission required. This test cannot start without the 40 cm positioning check.'
                    : 'Sit 40 cm (16 inches) away and keep your face in the guide.'}
              </p>
            </div>
          </div>

          <div className={`flex flex-1 flex-col items-center justify-center rounded-panel bg-white py-12 ${amslerCamera !== 'ready' ? 'opacity-45' : ''}`}>
            <div className="flex h-56 w-full items-center justify-center" aria-label={`Near Tumbling E line ${rowIndex + 1}`}>
              <span className="optotype select-none text-neutral-950" style={{ fontSize: `${snellenRows[rowIndex].size}px`, lineHeight: 1, transform: `rotate(${DIRECTION_ROTATION[nearTarget]}deg)` }}>E</span>
            </div>
            <div className="tnum mt-4 font-mono text-micro tracking-widest text-neutral-400 uppercase">Smallest current line: {formatAcuity(snellenRows[rowIndex].acuity, notation)}</div>
          </div>

          <div className="mt-6 text-center text-sm text-ink-3" aria-live="polite">Which way is the E opening?</div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {DIRECTIONS.map((direction) => {
              const Icon = DIRECTION_ICON[direction];
              const correct = feedback !== null && direction === nearTarget;
              const wrong = feedback === 'wrong' && answered === direction;
              return (
                <button
                  key={direction}
                  type="button"
                  onClick={() => handleNearAnswer(direction)}
                  disabled={amslerCamera !== 'ready' || Boolean(answered)}
                  aria-label={`E opens ${direction}`}
                  className="flex items-center justify-center rounded-panel border py-5 transition-colors disabled:cursor-default"
                  style={{ borderColor: correct ? 'var(--color-low)' : wrong ? 'var(--color-high)' : 'var(--color-line)', color: correct ? 'var(--color-low)' : wrong ? 'var(--color-high)' : 'var(--color-ink)', backgroundColor: 'var(--color-panel)' }}
                >
                  <Icon size={26} strokeWidth={1.75} aria-hidden />
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button onClick={() => onNavigate('retinal')} className="text-sm text-ink-4 hover:text-ink-2">{t.skip}</button>
            <Eyebrow>{nearBothActive ? 'Both eyes open' : 'One eye at a time · 40 cm'}</Eyebrow>
          </div>
        </div>
      </div>
    );
  }

  if (chartMode === 'peripheral') {
    const target = PERIPHERAL_TARGETS[peripheralIndex];
    return (
      <div className="flex h-full flex-col overflow-y-auto px-8 py-8 max-md:px-5">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <div className="mb-6 flex items-start justify-between gap-6">
            <div>
              <Eyebrow className="mb-1.5">Peripheral vision · target {peripheralIndex + 1} of {PERIPHERAL_TARGETS.length}</Eyebrow>
              <h1 className="text-head font-semibold text-ink">Keep both eyes open</h1>
            </div>
            <div className="tnum shrink-0 font-mono text-head text-ink">40 cm</div>
          </div>

          <div className="mb-6 flex items-center gap-4 rounded-panel border border-line bg-panel p-3">
            <video ref={amslerVideoRef} className="h-20 w-28 rounded border border-line-soft object-cover" style={{ transform: 'scaleX(-1)' }} muted playsInline aria-label="Webcam distance preview" />
            <div className="min-w-0">
              <Eyebrow className="mb-1">Webcam distance check</Eyebrow>
              <p className="text-sm text-ink-2">
                {amslerCamera === 'ready'
                  ? `Distance accepted${amslerDistance ? ` · about ${amslerDistance} cm` : ''}`
                  : amslerCamera === 'too-close'
                    ? `Move back. This test is locked below 40 cm${amslerDistance ? ` · about ${amslerDistance} cm` : ''}.`
                    : amslerCamera === 'blocked'
                      ? 'Camera permission is required to run the peripheral test.'
                      : 'Starting camera and checking your viewing distance...'}
              </p>
            </div>
          </div>

          <div className={`relative flex aspect-square flex-1 items-center justify-center rounded-panel bg-white p-5 ${amslerCamera !== 'ready' ? 'opacity-35' : ''}`}>
            <div className="relative h-full w-full border border-neutral-200">
              <span className="absolute left-1/2 top-1/2 h-[4mm] w-[4mm] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-950" aria-label="Centre fixation dot" />
              {peripheralVisible && (
                <span className="absolute h-[5mm] w-[5mm] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-950" style={{ left: `${target.x}%`, top: `${target.y}%` }} aria-label={`Peripheral target at ${target.label}`} />
              )}
            </div>
          </div>

          <div className="mt-5 text-center text-sm text-ink-3">
            {peripheralVisible ? 'Keep looking at the centre fixation dot.' : 'Did you see the brief dot without looking toward it?'}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button variant={peripheralResponse === true ? 'primary' : 'secondary'} disabled={amslerCamera !== 'ready' || peripheralVisible || peripheralResponse !== null} onClick={() => setPeripheralResponse(true)}>I saw it</Button>
            <Button variant={peripheralResponse === false ? 'primary' : 'secondary'} disabled={amslerCamera !== 'ready' || peripheralVisible || peripheralResponse !== null} onClick={() => setPeripheralResponse(false)}>I did not see it</Button>
          </div>
          {peripheralResponse !== null && (
            <div className="mt-3 flex justify-end">
              <Button variant="primary" onClick={() => {
                if (peripheralIndex < PERIPHERAL_TARGETS.length - 1) setPeripheralIndex((index) => index + 1);
                else finishAmslerEye('normal');
              }}>
                {peripheralIndex < PERIPHERAL_TARGETS.length - 1 ? 'Next target' : 'Finish test'}
                <ArrowRight size={15} strokeWidth={2} aria-hidden />
              </Button>
            </div>
          )}
          <div className="mt-4 flex justify-between">
            <button onClick={() => onNavigate('retinal')} className="text-sm text-ink-4 hover:text-ink-2">{t.skip}</button>
            <Eyebrow>Centre fixation · 40 cm</Eyebrow>
          </div>
        </div>
      </div>
    );
  }

  if (chartMode === 'amsler') {
    return (
      <div className="flex h-full flex-col overflow-y-auto px-8 py-8 max-md:px-5">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <div className="mb-6 flex items-start justify-between gap-6">
            <div>
              <Eyebrow className="mb-1.5">{eye === 'OD' ? 'Right eye · OD' : 'Left eye · OS'} · Amsler grid</Eyebrow>
              <h1 className="text-head font-semibold text-ink">Cover your {eye === 'OD' ? 'left' : 'right'} eye</h1>
            </div>
            <div className="tnum shrink-0 font-mono text-head text-ink">40 cm</div>
          </div>

          <div className="mb-6 flex items-center gap-4 rounded-panel border border-line bg-panel p-3">
            <video
              ref={amslerVideoRef}
              className="h-20 w-28 rounded border border-line-soft object-cover"
              style={{ transform: 'scaleX(-1)' }}
              muted
              playsInline
              aria-label="Webcam distance preview"
            />
            <div className="min-w-0">
              <Eyebrow className="mb-1">Webcam distance check</Eyebrow>
              <p className="text-sm text-ink-2">
                {amslerCamera === 'ready'
                  ? `Distance accepted${amslerDistance ? ` · about ${amslerDistance} cm` : ''}`
                  : amslerCamera === 'too-close'
                    ? `Move back. This test is locked below 40 cm${amslerDistance ? ` · about ${amslerDistance} cm` : ''}.`
                    : amslerCamera === 'blocked'
                      ? 'Camera permission is required to run the Amsler test.'
                      : 'Starting camera and checking your viewing distance...'}
              </p>
            </div>
          </div>

          <div className={`flex flex-1 flex-col items-center justify-center rounded-panel bg-white px-4 py-12 ${amslerCamera !== 'ready' ? 'opacity-35' : ''}`}>
            <div
              className="relative grid aspect-square w-full max-w-[520px] border-2 border-neutral-900 bg-white"
              style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }}
              aria-label="Amsler grid, twenty by twenty squares, five millimetres per square"
            >
              {Array.from({ length: 400 }, (_, index) => (
                <span
                  key={index}
                  className="border-b border-r border-neutral-900"
                  aria-hidden="true"
                />
              ))}
              <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-950" aria-label="Centre fixation dot" />
            </div>
            <div className="mt-6 max-w-sm text-center text-sm leading-relaxed text-ink-3">
              Keep your gaze on the centre dot. Report the first thing you notice: normal lines, wavy or distorted lines, or missing lines.
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            {([
              ['normal', 'Lines look normal'],
              ['distorted', 'Lines look wavy'],
              ['missing', 'Lines are missing'],
            ] as const).map(([value, label]) => (
              <Button key={value} variant={amslerFinding === value ? 'primary' : 'secondary'} disabled={amslerCamera !== 'ready'} onClick={() => finishAmslerEye(value)}>
                {label}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex justify-between">
            <button onClick={() => onNavigate('retinal')} className="text-sm text-ink-4 hover:text-ink-2">{t.skip}</button>
            <Eyebrow>One eye at a time · 40 cm</Eyebrow>
          </div>
        </div>
      </div>
    );
  }

  if (chartMode === 'color') {
    const plate = COLOR_PLATES[colorPlateIndex];
    return (
      <div className="flex h-full flex-col overflow-y-auto px-8 py-8 max-md:px-5">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <link rel="preload" as="image" href={COLOR_PLATES[0].src} />
          <div className="mb-6 flex items-start justify-between gap-6">
            <div>
              <Eyebrow className="mb-1.5">Final eye test · Test {colorPlateIndex + 1} of {COLOR_PLATES.length}</Eyebrow>
              <h1 className="text-head font-semibold text-ink">What number do you see?</h1>
            </div>
            <div className="tnum shrink-0 font-mono text-head text-ink">Color vision</div>
          </div>

          <div className="mb-6 border-y border-line-soft py-4 text-sm leading-relaxed text-ink-2">
            Look at the plate normally and enter the number you see. Use your usual glasses if you wear them. This is a screening test, not a diagnosis.
          </div>

          <div className="flex flex-1 flex-col items-center justify-center rounded-panel bg-white px-4 py-10">
            <img
              src={plate.src}
              width={800}
              height={800}
              loading={colorPlateIndex === 0 ? 'eager' : 'lazy'}
              decoding="async"
              alt={`Ishihara-style colour plate ${colorPlateIndex + 1} of ${COLOR_PLATES.length}`}
              className="block aspect-square h-auto w-full max-w-[450px] rounded-full"
            />
          </div>

          <form className="mt-6" onSubmit={(event) => { event.preventDefault(); submitColorAnswer(); }}>
            <label className="sr-only" htmlFor="color-answer">Number seen on the plate</label>
            <input id="color-answer" value={colorAnswer} onChange={(event) => setColorAnswer(event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" autoComplete="off" placeholder="Enter the number" className="w-full rounded-panel border border-line bg-panel px-4 py-3 text-body text-ink outline-none focus:border-ink-3" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <Button variant="secondary" type="button" disabled={colorPlateIndex === 0} onClick={() => { const previousIndex = colorPlateIndex - 1; setColorPlateIndex(previousIndex); setColorAnswer(colorAnswers[previousIndex] ?? ''); }}>
                Previous
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" type="button" onClick={() => submitColorAnswer(true)}>
                  I cannot tell
                </Button>
                <Button variant="primary" type="submit" disabled={!colorAnswer.trim()}>
                  {colorPlateIndex < COLOR_PLATES.length - 1 ? 'Next' : 'See result'}
                  <ArrowRight size={15} strokeWidth={2} aria-hidden />
                </Button>
              </div>
            </div>
          </form>
          <div className="mt-4 flex justify-between">
            <button onClick={() => onNavigate('retinal')} className="text-sm text-ink-4 hover:text-ink-2">{t.skip}</button>
            <Eyebrow>Screening only · not a diagnosis</Eyebrow>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col px-8 py-8 max-md:px-5">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <div className="mb-4 flex shrink-0 items-start justify-between gap-6">
          <div>
            <Eyebrow className="mb-1.5">
              {eye === 'OD' ? (language === 'hi' ? 'दाएँ आँख · OD' : 'Right eye · OD') : language === 'hi' ? 'बाएँ आँख · OS' : 'Left eye · OS'} · Distance Vision
            </Eyebrow>
            <h1 className="text-head font-semibold tracking-[-0.01em] text-ink">
              {language === 'hi' ? `अपनी ${eye === 'OD' ? 'बाईं' : 'दाईं'} आँख ढकें` : `Cover your ${eye === 'OD' ? 'left' : 'right'} eye`}
            </h1>
          </div>
          <div className="tnum shrink-0 font-mono text-head text-ink-2">
            {formatAcuity(currentRow.acuity, notation)}
          </div>
        </div>

        <div className="mb-6 h-px shrink-0 bg-line">
          <div className="h-px bg-ink transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center rounded-panel bg-white px-4 py-10">
          <div className="w-full max-w-[560px] overflow-x-auto" aria-label="Snellen-style distance vision chart">
            <div className="min-w-[440px] space-y-4 py-3 text-center text-neutral-950">
              {snellenRows.map((row) => (
                <button
                  key={row.label}
                  type="button"
                  onClick={() => finishEye(row.acuity)}
                  className="block w-full rounded px-3 py-1 transition-colors hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  aria-label={`Select line ${formatAcuity(row.acuity, notation)}: ${row.letters.join(' ')}`}
                >
                  <span className="optotype select-none whitespace-nowrap font-semibold tracking-[0.16em]" style={{ fontSize: `${row.size}px`, lineHeight: 1.05 }}>
                    {row.letters.join(' ')}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-5 text-center text-sm text-ink-3">Read the smallest line you can see clearly, then select that line. Repeat with the other eye.</p>
        </div>

        <div className="mt-6 shrink-0">
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => onNavigate('retinal')}
              className="text-sm text-ink-4 transition-colors hover:text-ink-2"
            >
              {t.skip}
            </button>
            <Eyebrow>{eye === 'OD' ? 'Right eye · then left eye' : 'Left eye · final line'}</Eyebrow>
          </div>
        </div>
      </div>
    </div>
  );
}
