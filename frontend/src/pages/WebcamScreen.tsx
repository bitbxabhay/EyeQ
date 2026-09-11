import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Check, Video } from 'lucide-react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Button, Eyebrow, Note, PageHeader, SectionRule } from '../components/ui';

interface WebcamScreenProps {
  onNavigate: (page: string) => void;
  language?: 'en' | 'hi';
  voiceEnabled?: boolean;
}

type DetectionPhase = 'init' | 'requesting' | 'denied' | 'scanning' | 'detected' | 'positioning' | 'ready';

const INK = '#9b9b96';
const INK_BRIGHT = '#edede9';
const MODERATE = '#c1942f';
const LOW = '#74a882';
const HIGH = '#c25a4c';
const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const getInstructions = (language: 'en' | 'hi') => ({
  init: { text: language === 'hi' ? 'कैमरा बंद' : 'Camera off', sub: language === 'hi' ? 'कैमरा चालू करके शुरू करें' : 'Turn on the camera to begin', tone: INK },
  requesting: { text: language === 'hi' ? 'अनुमति का इंतज़ार' : 'Waiting for permission', sub: language === 'hi' ? 'ब्राउज़र में कैमरा एक्सेस की अनुमति दें' : 'Allow camera access in your browser', tone: MODERATE },
  denied: { text: language === 'hi' ? 'कैमरा अवरुद्ध' : 'Camera blocked', sub: language === 'hi' ? 'साइट के लिए कैमरा अनुमति चालू करें और फिर से कोशिश करें' : 'Enable camera permissions for this site, then try again', tone: HIGH },
  scanning: { text: language === 'hi' ? 'आपको ढूंढा जा रहा है' : 'Looking for you', sub: language === 'hi' ? 'अपने चेहरे को फ्रेम में लाएँ' : 'Bring your face into the frame', tone: INK_BRIGHT },
  detected: { text: language === 'hi' ? 'चेहरा मिला' : 'Face found', sub: language === 'hi' ? 'आँखें मिलने तक स्थिर रहें' : 'Hold still while the eyes are located', tone: INK_BRIGHT },
  positioning: { text: language === 'hi' ? 'दूरी ठीक करें' : 'Adjust your distance', sub: language === 'hi' ? 'स्क्रीन से कम से कम 40 सेमी दूर बैठें' : 'Sit at least 40 cm from the screen', tone: MODERATE },
  ready: { text: language === 'hi' ? 'सही स्थिति' : 'Good position', sub: language === 'hi' ? 'आँखें मिल गईं और दूरी सही है' : 'Eyes located and distance calibrated', tone: LOW },
} as const satisfies Record<DetectionPhase, { text: string; sub: string; tone: string }>);

const getChecklist = (language: 'en' | 'hi') => [
  { id: 'face', label: language === 'hi' ? 'चेहरा मिला' : 'Face detected', phases: ['detected', 'positioning', 'ready'] },
  { id: 'eyes', label: language === 'hi' ? 'आँखें मिलीं' : 'Eyes located', phases: ['positioning', 'ready'] },
  { id: 'iris', label: language === 'hi' ? 'आईरिस केंद्रित' : 'Iris centred', phases: ['ready'] },
  { id: 'distance', label: language === 'hi' ? 'दूरी कैलिब्रेटेड' : 'Distance calibrated', phases: ['ready'] },
  { id: 'still', label: language === 'hi' ? 'सिर स्थिर' : 'Head stable', phases: ['ready'] },
] as const;

const getGuidance = (language: 'en' | 'hi') => [
  language === 'hi' ? 'स्क्रीन से कम से कम 40 सेमी दूर बैठें' : 'Sit at least 40 cm from the screen',
  language === 'hi' ? 'कैमरे के सामने सीधे मुख करके बैठें' : 'Face the camera straight on',
  language === 'hi' ? 'चेहरे को सामने से रोशनी दें, पीछे नहीं' : 'Light your face from the front, not behind',
  language === 'hi' ? 'अगर संभव हो तो चश्मा हटाएँ' : 'Take glasses off if you can',
  language === 'hi' ? 'सामान्य रूप सेBlink करें — stare न करें' : 'Blink normally — do not stare',
];

type LandmarkPoint = { x: number; y: number; z?: number };
type LandmarkFrame = LandmarkPoint[];
type FaceResultLike = {
  faceLandmarks?: LandmarkFrame[];
  landmarks?: LandmarkFrame[];
};

const getEyeCenter = (
  landmarks: LandmarkFrame,
  indices: number[],
) => {
  const points = indices
    .map((idx) => landmarks[idx])
    .filter(Boolean)
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

  if (points.length === 0) return null;

  const avgX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const avgY = points.reduce((sum, point) => sum + point.y, 0) / points.length;

  return { x: avgX, y: avgY };
};

export default function WebcamScreen({ onNavigate, language = 'en', voiceEnabled = false }: WebcamScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastVoicePromptRef = useRef<string | null>(null);
  const t = {
    eyebrow: language === 'hi' ? 'कैप्चर · चरण 1 का 3' : 'Capture · Step 1 of 3',
    title: language === 'hi' ? 'आंख का पता' : 'Eye detection',
    sub: language === 'hi' ? 'चेहरा और आँखें ढूंढता है, और यह भी जाँचता है कि आप दृष्टि परीक्षण के लिए सही दूरी पर बैठे हैं।' : 'Finds your face and eyes, and checks you are sitting at the right distance for the acuity test.',
    open: language === 'hi' ? 'कैमरा खोलें' : 'Open camera',
    continue: language === 'hi' ? 'दृष्टि परीक्षण पर जाएँ' : 'Continue to acuity test',
    skip: language === 'hi' ? 'यह चरण छोड़ें' : 'Skip this step',
    detection: language === 'hi' ? 'पता' : 'Detection',
    ready: language === 'hi' ? 'सही स्थिति' : 'Good position',
    live: language === 'hi' ? 'लाइव' : 'Live',
    required: language === 'hi' ? 'कैमरा एक्सेस आवश्यक है' : 'Camera access required',
    blocked: language === 'hi' ? 'कैमरा अवरुद्ध' : 'Camera blocked',
    browser: language === 'hi' ? 'ब्राउज़र में कैमरा अनुमति चालू करें, फिर से प्रयास करें।' : 'Enable camera permissions for this site in your browser, then try again.',
    choose: language === 'hi' ? 'नीचे वाला बटन चुनें और कैमरा खोलें।' : 'Choose the button below to open your camera and allow access.',
    how: language === 'hi' ? 'बैठने का तरीका' : 'How to sit',
    limits: language === 'hi' ? 'सीमाएँ' : 'Limits',
    limitNote: language === 'hi' ? 'वेबकैम केवल आँख के सामने की तरफ देखता है। यह रेटिना की फोटो नहीं ले सकता — इसके लिए फंडस कैमरा जरूरी है, और अगर आपके पास है तो अगला कदम यही है।' : 'A webcam sees the front of the eye only. It cannot image your retina — that needs a fundus camera, which is the next step if you have one.',
  };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastFaceMetricsRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const smoothedFaceRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const lastDetectionAtRef = useRef<number>(0);
  const lastDetectedFaceRef = useRef<{ faceLeft: number; faceRight: number; faceTop: number; faceBottom: number; leftEye: { x: number; y: number } | null; rightEye: { x: number; y: number } | null } | null>(null);
  const stableFramesRef = useRef(0);
  const phaseRef = useRef<DetectionPhase>('init');
  const [phase, setPhase] = useState<DetectionPhase>('init');
  const [streamActive, setStreamActive] = useState(false);
  const [cameraIssue, setCameraIssue] = useState<string | null>(null);
  const [voiceGuideEnabled, setVoiceGuideEnabled] = useState(true);
  const [quality, setQuality] = useState({
    face: 0,
    eyes: 0,
    stability: 0,
    distance: 0,
  });
  const overallScore = Math.round((quality.face + quality.eyes + quality.stability + quality.distance) / 4);
  const overallState = overallScore >= 85 ? 'ready' : overallScore >= 60 ? 'watching' : 'poor';

  const stopStream = () => {
    const video = videoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStreamActive(false);
  };

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (!voiceGuideEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const speakGuidance = () => {
      const spokenText =
        phase === 'denied'
          ? language === 'hi'
            ? 'कैमरा अनुमति आवश्यक है। कैमरा चालू करें और फिर से कोशिश करें।'
            : 'Camera access is required. Please enable the camera and try again.'
          : phase === 'scanning'
            ? language === 'hi'
              ? 'कृपया कैमरे के सही स्थान पर बैठें। सामने से रोशनी दें और अपना चेहरा फ्रेम में रखें।'
              : 'Please position the camera correctly. Add light from the front and keep your face in frame.'
            : phase === 'detected'
              ? language === 'hi'
                ? 'चेहरा मिल गया है। कृपया आंखें साफ़ दिखें और स्थिर रहें।'
                : 'Face detected. Please keep still while the camera locates your eyes.'
              : phase === 'positioning'
                ? language === 'hi'
                  ? 'दूरी सही करें। स्क्रीन से 50 से 60 सेमी की दूरी बनाइए और सीधा मुख रखिए।'
                  : 'Please adjust the distance. Sit at least 40 centimeters away and face the camera straight on.'
                : phase === 'ready'
                  ? language === 'hi'
                    ? 'सही स्थिति है। स्क्रीनिंग तैयार है। कृपया दृश्य परीक्षण जारी रखें।'
                    : 'Good position. Screening is ready. Please continue with the acuity test.'
                  : null;

      const issueText =
        cameraIssue && (phase === 'scanning' || phase === 'detected' || phase === 'positioning')
          ? cameraIssue
          : null;

      const prompt = issueText ?? spokenText;
      if (!prompt || prompt === lastVoicePromptRef.current) return;

      lastVoicePromptRef.current = prompt;
      const utterance = new SpeechSynthesisUtterance(prompt);
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };

    speakGuidance();
    const interval = window.setInterval(speakGuidance, 5000);
    return () => window.clearInterval(interval);
  }, [cameraIssue, language, phase, voiceGuideEnabled]);

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraIssue(
        language === 'hi'
          ? 'इस ब्राउज़र में कैमरा API उपलब्ध नहीं है। ब्राउज़र अपडेट करें या Chrome/Safari का उपयोग करें।'
          : 'This browser does not support camera access. Please use Chrome or Safari and update the browser.',
      );
      setPhase('denied');
      return;
    }

    const requestStream = async (constraints: MediaStreamConstraints) => {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (!landmarkerRef.current) {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
        );

        landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: FACE_MODEL_URL,
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.15,
          minFacePresenceConfidence: 0.1,
          minTrackingConfidence: 0.1,
        });
      }

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
        setStreamActive(true);
        setPhase('scanning');
      }
    };

    stopStream();
    setCameraIssue(null);
    setPhase('requesting');

    try {
      await requestStream({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: { ideal: 'user' },
        },
      });
    } catch (firstError) {
      try {
        await requestStream({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
      } catch (secondError) {
        const name = secondError instanceof Error ? secondError.name : '';
        const message =
          name === 'NotAllowedError'
            ? language === 'hi'
              ? 'कैमरा अनुमति नहीं दी गई। सेटिंग्स में कैमरा चालू करें और फिर से प्रयास करें।'
              : 'Camera permission was blocked. Turn on camera access and try again.'
            : name === 'NotFoundError' || name === 'OverconstrainedError'
              ? language === 'hi'
                ? 'कैमरा सही से नहीं मिल रहा है। 4K USB कैमरा या लैपटॉप कैमरा सही से जोड़ें और फिर से कोशिश करें।'
                : 'The camera could not be selected. Check your external webcam or laptop camera and try again.'
              : language === 'hi'
                ? 'कैमरा शुरू नहीं हो सका। किसी दूसरी ऐप में कैमरा उपयोग न हो, फिर से कोशिश करें।'
                : 'The camera could not start. Close other apps using it and try again.';

        setCameraIssue(message);
        setPhase('denied');
        stopStream();
      }
    }
  };

  useEffect(() => {
    if (!streamActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const activePhase = phaseRef.current;
      const overlayTone = activePhase === 'ready' ? LOW : activePhase === 'positioning' ? MODERATE : INK_BRIGHT;

      const now = performance.now();
      const shouldDetect = now - lastDetectionAtRef.current > 180;

      if (shouldDetect && video.readyState >= 2 && landmarkerRef.current) {
        const result = landmarkerRef.current.detectForVideo(video, now) as FaceResultLike;
        const landmarks = result.faceLandmarks?.[0] ?? result.landmarks?.[0];
        lastDetectionAtRef.current = now;

        if (landmarks && landmarks.length > 0) {
          const xs = landmarks.map((point: LandmarkPoint) => point.x * video.videoWidth);
          const ys = landmarks.map((point: LandmarkPoint) => point.y * video.videoHeight);

          const faceLeft = Math.min(...xs);
          const faceRight = Math.max(...xs);
          const faceTop = Math.min(...ys);
          const faceBottom = Math.max(...ys);
          const faceCenterX = (faceLeft + faceRight) / 2;
          const faceCenterY = (faceTop + faceBottom) / 2;
          const faceWidth = faceRight - faceLeft;
          const faceHeight = faceBottom - faceTop;

          const previous = lastFaceMetricsRef.current ?? {
            x: faceCenterX,
            y: faceCenterY,
            width: faceWidth,
            height: faceHeight,
          };
          const smoothingFactor = 0.28;
          const nextSmoothed = {
            x: previous.x + (faceCenterX - previous.x) * smoothingFactor,
            y: previous.y + (faceCenterY - previous.y) * smoothingFactor,
            width: previous.width + (faceWidth - previous.width) * smoothingFactor,
            height: previous.height + (faceHeight - previous.height) * smoothingFactor,
          };
          smoothedFaceRef.current = nextSmoothed;
          lastFaceMetricsRef.current = nextSmoothed;

          const leftEye = getEyeCenter(landmarks, [33, 133, 159, 145, 153, 154]);
          const rightEye = getEyeCenter(landmarks, [362, 263, 386, 374, 380, 381]);
          const eyeFound = Boolean(leftEye && rightEye);
          const faceDetected = faceWidth > 40 && faceHeight > 60;
          const centered =
            Math.abs(nextSmoothed.x - video.videoWidth / 2) < video.videoWidth * 0.28 &&
            Math.abs(nextSmoothed.y - video.videoHeight / 2) < video.videoHeight * 0.30;
          const faceRatio = faceWidth / video.videoWidth;
          // This ratio is a webcam screening estimate, not a calibrated rangefinder.
          const estimatedDistanceCm = faceRatio > 0 ? 12 / faceRatio : Infinity;
          const distanceOk = estimatedDistanceCm >= 40 && estimatedDistanceCm <= 75 && faceHeight > 60;

          const eyeDistancePx = leftEye && rightEye
            ? Math.hypot((rightEye.x - leftEye.x) * video.videoWidth, (rightEye.y - leftEye.y) * video.videoHeight)
            : 0;
          const eyeSpacingOk = eyeDistancePx > 90;
          const eyeLevelOk = leftEye && rightEye ? Math.abs((leftEye.y - rightEye.y) * video.videoHeight) < 58 : false;

          const movementX = Math.abs(nextSmoothed.x - previous.x);
          const movementY = Math.abs(nextSmoothed.y - previous.y);
          const movementW = Math.abs(nextSmoothed.width - previous.width);
          const movementH = Math.abs(nextSmoothed.height - previous.height);

          const stabilityPercent = Math.max(
            0,
            Math.min(
              100,
              100 - (
                (movementX / (video.videoWidth * 0.12)) +
                (movementY / (video.videoHeight * 0.15)) +
                (movementW / (video.videoWidth * 0.12)) +
                (movementH / (video.videoHeight * 0.15))
              ) * 90,
            ),
          );

          const headStableCandidate = stabilityPercent >= 78 &&
            movementX < video.videoWidth * 0.10 &&
            movementY < video.videoHeight * 0.12 &&
            movementW < video.videoWidth * 0.12 &&
            movementH < video.videoHeight * 0.12;

          stableFramesRef.current = headStableCandidate ? stableFramesRef.current + 1 : 0;
          const headStable = stableFramesRef.current >= 2 && stabilityPercent >= 78;

          const faceSizeRatio = Math.min(1, faceRatio / 0.34);
          const faceCenterPenalty = Math.max(
            0,
            1 - (
              (Math.abs(nextSmoothed.x - video.videoWidth / 2) / (video.videoWidth * 0.22)) +
              (Math.abs(nextSmoothed.y - video.videoHeight / 2) / (video.videoHeight * 0.24))
            ) / 2,
          );
          const faceScore = faceDetected
            ? Math.min(100, Math.max(0, Math.round((faceSizeRatio * 0.6 + faceCenterPenalty * 0.4) * 100)))
            : 0;

          const eyeScore = leftEye && rightEye && eyeFound
            ? Math.min(100, Math.max(0, Math.round(((Math.min(1, eyeDistancePx / 160) * 0.6) + (eyeLevelOk ? 0.4 : 0)) * 100)))
            : 0;

          const stabilityScore = Math.round(stabilityPercent);
          const distanceScore = distanceOk && centered
            ? 100
            : Math.max(0, Math.round(100 - ((Math.abs(nextSmoothed.x - video.videoWidth / 2) / (video.videoWidth * 0.25)) + (Math.abs(nextSmoothed.y - video.videoHeight / 2) / (video.videoHeight * 0.25))) * 50));

          const nextQuality = {
            face: faceDetected ? faceScore : 0,
            eyes: eyeFound ? eyeScore : 0,
            stability: stabilityScore,
            distance: distanceOk && centered ? 100 : distanceScore,
          };

          setQuality(nextQuality);

          const readinessScore =
            (nextQuality.face * 0.35) +
            (nextQuality.eyes * 0.3) +
            (nextQuality.stability * 0.2) +
            (nextQuality.distance * 0.15);

          const readyNow = readinessScore >= 82 && faceDetected && eyeFound && eyeSpacingOk && eyeLevelOk && centered && distanceOk && headStable;
          if (readyNow && phaseRef.current !== 'ready') {
            setPhase('ready');
          }

          if (faceDetected) {
            lastFaceMetricsRef.current = {
              x: faceCenterX,
              y: faceCenterY,
              width: faceWidth,
              height: faceHeight,
            };
          }

          let nextPhase: DetectionPhase = 'scanning';
          if (!faceDetected) nextPhase = 'scanning';
          else if (!eyeFound || !eyeSpacingOk || !eyeLevelOk) nextPhase = 'detected';
          else if (!centered || !distanceOk || !headStable) nextPhase = 'positioning';
          else nextPhase = 'ready';

          if (nextPhase !== phaseRef.current) {
            setPhase(nextPhase);
          }

          const issueMessage =
            !faceDetected
              ? language === 'hi'
                ? 'चेहरा कैमरे में साफ़ नहीं दिख रहा है। सामने से रोशनी दें और सीधा मुख करके बैठें।'
                : 'The camera cannot see your face clearly. Add front light and sit facing the camera.'
              : !eyeFound || !eyeSpacingOk || !eyeLevelOk
                ? language === 'hi'
                  ? 'आँखें साफ़ नहीं दिख रही हैं। सिर को थोड़ा स्थिर रखें और कैमरे के सामने आँखें साफ़ दिखें।'
                  : 'The eyes are not clear enough. Keep your head steady and make sure both eyes are visible to the camera.'
                : !centered || !distanceOk || !headStable
                  ? language === 'hi'
                    ? 'कैमरे के करीब/दूर ना जाएँ। स्क्रीन से कम से कम 40 सेमी दूर बैठें, सीधा मुख रखें और सिर स्थिर रखें।'
                    : 'Move back until you are at least 40 cm from the screen, keep your face centered, and hold still.'
                  : null;

          setCameraIssue((current) => (current === issueMessage ? current : issueMessage));

          const boxX = (faceLeft / video.videoWidth) * w;
          const boxY = (faceTop / video.videoHeight) * h;
          const boxW = ((faceRight - faceLeft) / video.videoWidth) * w;
          const boxH = ((faceBottom - faceTop) / video.videoHeight) * h;

          lastDetectedFaceRef.current = { faceLeft: boxX, faceRight: boxX + boxW, faceTop: boxY, faceBottom: boxY + boxH, leftEye: leftEye ? { x: leftEye.x * w, y: leftEye.y * h } : null, rightEye: rightEye ? { x: rightEye.x * w, y: rightEye.y * h } : null };

          ctx.strokeStyle = overlayTone;
          ctx.lineWidth = 2;
          ctx.strokeRect(boxX, boxY, boxW, boxH);

          if (leftEye && rightEye) {
            const leftX = leftEye.x * w;
            const leftY = leftEye.y * h;
            const rightX = rightEye.x * w;
            const rightY = rightEye.y * h;

            ctx.fillStyle = overlayTone;
            ctx.beginPath();
            ctx.arc(leftX, leftY, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(rightX, rightY, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          if (phaseRef.current !== 'scanning') {
            setPhase('scanning');
          }
          setCameraIssue(
            language === 'hi'
              ? 'चेहरा नहीं दिख रहा है। लाइट सही करें, कैमरे के सामने सीधा बैठें और फिर से कोशिश करें।'
              : 'No face is visible. Improve lighting, face the camera directly, and try again.',
          );
        }
      }

      const previousFace = lastDetectedFaceRef.current;
      if (previousFace) {
        ctx.strokeStyle = overlayTone;
        ctx.lineWidth = 2;
        ctx.strokeRect(previousFace.faceLeft, previousFace.faceTop, previousFace.faceRight - previousFace.faceLeft, previousFace.faceBottom - previousFace.faceTop);

        if (previousFace.leftEye && previousFace.rightEye) {
          ctx.fillStyle = overlayTone;
          ctx.beginPath();
          ctx.arc(previousFace.leftEye.x, previousFace.leftEye.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(previousFace.rightEye.x, previousFace.rightEye.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const cx = w / 2;
      const cy = h / 2;
      if (activePhase === 'scanning') {
        const scanY = ((Date.now() % 2200) / 2200) * h;
        ctx.strokeStyle = 'rgba(237,237,233,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(w, scanY);
        ctx.stroke();
      }

      if (activePhase === 'detected' || activePhase === 'positioning' || activePhase === 'ready') {
        const bx = cx - 90;
        const by = cy - 120;
        const bw = 180;
        const bh = 230;
        const corner = 18;

        ctx.strokeStyle = overlayTone;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx, by + corner);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + corner, by);
        ctx.moveTo(bx + bw - corner, by);
        ctx.lineTo(bx + bw, by);
        ctx.lineTo(bx + bw, by + corner);
        ctx.moveTo(bx, by + bh - corner);
        ctx.lineTo(bx, by + bh);
        ctx.lineTo(bx + corner, by + bh);
        ctx.moveTo(bx + bw - corner, by + bh);
        ctx.lineTo(bx + bw, by + bh);
        ctx.lineTo(bx + bw, by + bh - corner);
        ctx.stroke();
      }

      if (activePhase === 'positioning' || activePhase === 'ready') {
        const tone = activePhase === 'ready' ? LOW : INK_BRIGHT;
        const ey = cy - 28;
        ctx.strokeStyle = tone;
        ctx.fillStyle = tone;
        ctx.lineWidth = 1;
        [cx - 38, cx + 38].forEach((ex) => {
          ctx.beginPath();
          ctx.ellipse(ex, ey, 23, 12, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(ex, ey, 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(ex, ey, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [streamActive]);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const instructions = getInstructions(language);
  const checklist = getChecklist(language);
  const guidance = getGuidance(language);
  const info = instructions[phase];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-8 py-10 max-md:px-5">
        <PageHeader
          eyebrow={t.eyebrow}
          title={t.title}
          sub={t.sub}
        />

        <div className="grid grid-cols-[1fr_260px] gap-8 max-lg:grid-cols-1">
          <div>
            <div className="relative aspect-4/3 overflow-hidden rounded-panel border border-line bg-panel">
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ transform: 'scaleX(-1)', display: streamActive ? 'block' : 'none' }}
                muted
                playsInline
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 h-full w-full"
                style={{ transform: 'scaleX(-1)' }}
              />

              {!streamActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
                  <Video size={22} strokeWidth={1.25} className="mb-4 text-ink-4" aria-hidden />
                  <div className="mb-1.5 text-body text-ink">
                    {phase === 'denied' ? t.blocked : t.required}
                  </div>
                  <div className="max-w-[240px] text-sm text-ink-3">
                    {phase === 'denied' ? t.browser : t.choose}
                  </div>
                </div>
              )}

              {streamActive && (
                <>
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded border border-line bg-ground/80 px-2 py-1 font-mono text-micro tracking-[0.12em] uppercase backdrop-blur-sm">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: info.tone }}
                    />
                    <span className="text-ink-2">{t.live}</span>
                  </div>
                </>
              )}
            </div>

            {streamActive && (
              <div className="mt-4 grid gap-2 rounded-panel border border-line bg-panel-soft p-3">
                <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.12em] text-ink-3">
                  <span>{language === 'hi' ? 'क्वालिटी स्कोर' : 'Quality score'}</span>
                  <span>{overallScore}%</span>
                </div>
                <div className="space-y-2">
                  {[
                    { key: 'face', label: language === 'hi' ? 'चेहरा' : 'Face', value: quality.face },
                    { key: 'eyes', label: language === 'hi' ? 'आँखें' : 'Eyes', value: quality.eyes },
                    { key: 'stability', label: language === 'hi' ? 'सिर स्थिर' : 'Head stable', value: quality.stability },
                    { key: 'distance', label: language === 'hi' ? 'दूरी' : 'Distance', value: quality.distance },
                  ].map((item) => (
                    <div key={item.key}>
                      <div className="mb-1 flex items-center justify-between text-xs text-ink-3">
                        <span>{item.label}</span>
                        <span>{item.value}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
                        <div
                          className="h-full rounded-full bg-low"
                          style={{ width: `${Math.max(8, item.value)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {(phase === 'init' || phase === 'denied') && (
                <Button variant="primary" onClick={startCamera}>
                  {t.open}
                </Button>
              )}
              {streamActive && (
                <Button
                  variant="ghost"
                  onClick={() => setVoiceGuideEnabled((current) => !current)}
                >
                  {voiceGuideEnabled
                    ? language === 'hi'
                      ? 'वॉयस गाइड बंद करें'
                      : 'Turn Off Voice Guidance'
                    : language === 'hi'
                      ? 'वॉयस गाइड चालू करें'
                      : 'Turn On Voice Guidance'}
                </Button>
              )}
              {phase === 'ready' && (
                <Button variant="primary" onClick={() => onNavigate('vision-test')}>
                  {t.continue}
                  <ArrowRight size={15} strokeWidth={2} aria-hidden />
                </Button>
              )}
              <Button variant="ghost" onClick={() => onNavigate('vision-test')}>
                {t.skip}
              </Button>
            </div>
          </div>

          <div>
            <SectionRule>{t.detection}</SectionRule>
            <ul className="mb-8">
              {checklist.map((item) => {
                const done = item.phases.some((value) => value === phase);
                return (
                  <li
                    key={item.id}
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
                    <span className={done ? 'text-sm text-ink' : 'text-sm text-ink-4'}>{item.label}</span>
                  </li>
                );
              })}
            </ul>

            <SectionRule>{t.how}</SectionRule>
            <ul className="mb-8">
              {guidance.map((g) => (
                <li key={g} className="border-b border-line-soft py-2 text-sm text-ink-3 last:border-0">
                  {g}
                </li>
              ))}
            </ul>

            <Eyebrow className="mb-2">{t.limits}</Eyebrow>
            <Note tone="limit">{t.limitNote}</Note>
          </div>
        </div>
      </div>
    </div>
  );
}
