import { useEffect, useState } from 'react';
import { SignedIn, SignedOut, SignIn, SignUp, useAuth, useClerk, useUser } from '@clerk/clerk-react';
import Sidebar, { MobileBar, getNavLabels } from './components/Sidebar';
import ErrorBoundary, { NotFound } from './components/ErrorBoundary';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import WebcamScreen from './pages/WebcamScreen';
import VisionTest from './pages/VisionTest';
import RetinalAnalysis from './pages/RetinalAnalysis';
import AIAnalysis from './pages/AIAnalysis';
import Doctors from './pages/Doctors';
import Report from './pages/Report';
import History from './pages/History';
import DiabetesOnboarding from './pages/DiabetesOnboarding';
import type { VisionOutcome } from './lib/scoring';
import type { PredictResult } from './lib/api';
import { fetchDiabetesProfile, saveDiabetesProfile, setAuthTokenGetter } from './lib/api';

type Page =
  | 'landing'
  | 'auth'
  | 'dashboard'
  | 'profile'
  | 'webcam'
  | 'vision-test'
  | 'retinal'
  | 'ai-analysis'
  | 'doctors'
  | 'report'
  | 'history';

type Language = 'en' | 'hi';
type ThemeMode = 'dark' | 'light';

const speakText = (text: string, enabled: boolean, language: Language) => {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
  utterance.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};

export default function App() {
  const hasClerkKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
  if (!hasClerkKey) return <DemoApp />;
  return <ClerkApp />;
}

function DemoApp() {
  const [page, setPage] = useState<Page>('dashboard');
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('eyecare-language');
    return saved === 'hi' ? 'hi' : 'en';
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('eyecare-theme');
    return saved === 'light' ? 'light' : 'dark';
  });
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('eyecare-voice');
    return saved === 'true';
  });
  const [visionResult, setVisionResult] = useState<VisionOutcome | null>(null);
  const [retinalResult, setRetinalResult] = useState<PredictResult | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    localStorage.setItem('eyecare-language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('eyecare-theme', theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('eyecare-voice', String(voiceEnabled));
  }, [voiceEnabled]);

  useEffect(() => {
    setAuthTokenGetter(async () => null);
  }, []);

  const bumpHistory = () => setHistoryVersion((v) => v + 1);
  const handleNavigate = (p: string) => setPage(p as Page);
  const handleLogout = () => {
    setNavOpen(false);
    setPage('dashboard');
  };

  return (
    <AppShell
      page={page}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      patientName="Patient"
      patientEmail="patient@example.com"
      patientImageUrl={null}
      navOpen={navOpen}
      setNavOpen={setNavOpen}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      settingsOpen={settingsOpen}
      setSettingsOpen={setSettingsOpen}
      language={language}
      setLanguage={setLanguage}
      theme={theme}
      setTheme={setTheme}
      voiceEnabled={voiceEnabled}
      setVoiceEnabled={setVoiceEnabled}
      visionResult={visionResult}
      setVisionResult={setVisionResult}
      retinalResult={retinalResult}
      setRetinalResult={setRetinalResult}
      historyVersion={historyVersion}
      bumpHistory={bumpHistory}
    />
  );
}

function ClerkApp() {
  const [page, setPage] = useState<Page>('landing');
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('eyecare-language');
    return saved === 'hi' ? 'hi' : 'en';
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('eyecare-theme');
    return saved === 'light' ? 'light' : 'dark';
  });
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('eyecare-voice');
    return saved === 'true';
  });
  const { getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  useEffect(() => {
    localStorage.setItem('eyecare-language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('eyecare-theme', theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('eyecare-voice', String(voiceEnabled));
  }, [voiceEnabled]);

  const [visionResult, setVisionResult] = useState<VisionOutcome | null>(null);
  const [retinalResult, setRetinalResult] = useState<PredictResult | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [onboardingStatus, setOnboardingStatus] = useState<'loading' | 'needed' | 'complete'>('loading');
  const bumpHistory = () => setHistoryVersion((v) => v + 1);

  useEffect(() => {
    if (!user) return;
    setOnboardingStatus('loading');
    fetchDiabetesProfile()
      .then(() => setOnboardingStatus('complete'))
      .catch(() => setOnboardingStatus('needed'));
  }, [user]);

  const completeOnboarding = async (profile: Parameters<typeof saveDiabetesProfile>[0] | null) => {
    if (profile) {
      try {
        await saveDiabetesProfile(profile);
      } catch {
        // Do not block access to screening if the profile service is unavailable.
      }
    }
    setOnboardingStatus('complete');
  };

  const handleNavigate = (p: string) => {
    setPage(p as Page);
  };

  const handleLogout = () => {
    setNavOpen(false);
    signOut(() => setPage('landing'));
  };

  return (
    <>
      <SignedOut>
        <ErrorBoundary onReset={() => setPage('landing')}>
          <div className="size-full bg-ground">
            {page === 'auth' ? (
              <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-ground px-6 py-14">
                <div className="mb-2 flex gap-5 border-b border-line-soft">
                  {(['login', 'register'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setAuthTab(t)}
                      className={
                        authTab === t
                          ? '-mb-px border-b border-ink pb-2.5 text-sm font-medium text-ink'
                          : '-mb-px border-b border-transparent pb-2.5 text-sm text-ink-3 transition-colors hover:text-ink-2'
                      }
                    >
                      {t === 'login' ? 'Sign in' : 'Register'}
                    </button>
                  ))}
                </div>
                {authTab === 'login' ? (
                  <SignIn routing="virtual" appearance={{ variables: { colorPrimary: '#1A4A6B' } }} />
                ) : (
                  <SignUp routing="virtual" appearance={{ variables: { colorPrimary: '#1A4A6B' } }} />
                )}
              </div>
            ) : (
              <Landing onGetStarted={() => setPage('auth')} language={language} />
            )}
          </div>
        </ErrorBoundary>
      </SignedOut>

      <SignedIn>
        {onboardingStatus === 'loading' ? (
          <div className="flex size-full items-center justify-center bg-ground text-sm text-ink-3">Preparing your screening profile…</div>
        ) : onboardingStatus === 'needed' ? (
          <div className="size-full bg-ground">
            <DiabetesOnboarding onComplete={completeOnboarding} language={language} />
          </div>
        ) : (
          <AppShell
            page={page === 'landing' || page === 'auth' ? 'dashboard' : page}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          patientName={user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Patient'}
          patientEmail={user?.primaryEmailAddress?.emailAddress || 'patient@example.com'}
          patientImageUrl={user?.imageUrl || null}
          navOpen={navOpen}
          setNavOpen={setNavOpen}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          setTheme={setTheme}
          voiceEnabled={voiceEnabled}
          setVoiceEnabled={setVoiceEnabled}
          visionResult={visionResult}
          setVisionResult={setVisionResult}
          retinalResult={retinalResult}
          setRetinalResult={setRetinalResult}
          historyVersion={historyVersion}
            bumpHistory={bumpHistory}
          />
        )}
      </SignedIn>
    </>
  );
}

interface AppShellProps {
  page: Page;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  patientName: string;
  patientEmail: string;
  patientImageUrl: string | null;
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  visionResult: VisionOutcome | null;
  setVisionResult: (v: VisionOutcome | null) => void;
  retinalResult: PredictResult | null;
  setRetinalResult: (v: PredictResult | null) => void;
  historyVersion: number;
  bumpHistory: () => void;
}

function AppShell({
  page,
  onNavigate,
  onLogout,
  patientName,
  patientEmail,
  patientImageUrl,
  navOpen,
  setNavOpen,
  sidebarOpen,
  setSidebarOpen,
  settingsOpen,
  setSettingsOpen,
  language,
  setLanguage,
  theme,
  setTheme,
  voiceEnabled,
  setVoiceEnabled,
  visionResult,
  setVisionResult,
  retinalResult,
  setRetinalResult,
  historyVersion,
  bumpHistory,
}: AppShellProps) {
  useEffect(() => {
    if (page === 'dashboard') {
      speakText(language === 'hi' ? 'डैशबोर्ड खुल गया' : 'Dashboard opened', voiceEnabled, language);
    }
  }, [page, language, voiceEnabled]);

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={onNavigate}
            historyVersion={historyVersion}
            patientName={patientName}
            language={language}
          />
        );
      case 'profile':
        return <Profile patientName={patientName} patientEmail={patientEmail} patientImageUrl={patientImageUrl} language={language} />;
      case 'webcam':
        return <WebcamScreen onNavigate={onNavigate} language={language} voiceEnabled={voiceEnabled} />;
      case 'vision-test':
        return <VisionTest onNavigate={onNavigate} onComplete={setVisionResult} language={language} />;
      case 'retinal':
        return <RetinalAnalysis onNavigate={onNavigate} onComplete={setRetinalResult} language={language} />;
      case 'ai-analysis':
        return (
          <AIAnalysis
            onNavigate={onNavigate}
            vision={visionResult}
            retinal={retinalResult}
            onSaved={bumpHistory}
            patientName={patientName}
            language={language}
          />
        );
      case 'doctors':
        return <Doctors onNavigate={onNavigate} language={language} />;
      case 'report':
        return (
          <Report
            onNavigate={onNavigate}
            historyVersion={historyVersion}
            patientName={patientName}
            language={language}
          />
        );
      case 'history':
        return <History historyVersion={historyVersion} language={language} />;
      default:
        return <NotFound onHome={() => onNavigate('dashboard')} />;
    }
  };

  return (
    <div className="flex size-full bg-ground">
      <Sidebar
        currentPage={page}
        onNavigate={onNavigate}
        onLogout={onLogout}
        patientName={patientName}
        patientImageUrl={patientImageUrl}
        mobileOpen={navOpen}
        onMobileOpenChange={setNavOpen}
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen((open) => !open)}
        language={language}
        onLanguageChange={setLanguage}
        theme={theme}
        onThemeChange={setTheme}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={setVoiceEnabled}
        settingsOpen={settingsOpen}
        onSettingsOpenChange={setSettingsOpen}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileBar title={getNavLabels(language)[page] ?? 'EyeQ'} onOpenNav={() => setNavOpen(true)} />
        <main key={page} className="min-h-0 flex-1 animate-rise overflow-hidden">
          <ErrorBoundary onReset={() => onNavigate('dashboard')}>{renderPage()}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
