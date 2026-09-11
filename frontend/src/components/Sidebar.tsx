import { useEffect } from 'react';
import {
  Activity,
  Aperture,
  Eye,
  FileText,
  History,
  LogOut,
  Menu,
  ScanFace,
  Settings,
  Stethoscope,
  User,
  Waves,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cx } from './ui';
import { Wordmark } from './Logo';

export { Wordmark };

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  patientName: string;
  patientImageUrl?: string | null;
  /** Mobile drawer state, owned by App so the top bar can toggle it. */
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
}

type SidebarLanguage = 'en' | 'hi';
type SidebarTheme = 'dark' | 'light';

/**
 * Grouped by the actual pipeline — capture, then interpret, then act. The
 * grouping encodes the order a screening really happens in, so the nav doubles
 * as a map of where you are in it.
 */
const NAV_BY_LANGUAGE = {
  en: {
    overview: 'Overview',
    capture: 'Capture',
    interpret: 'Interpret',
    act: 'Act',
    dashboard: 'Summary',
    profile: 'Patient record',
    webcam: 'Eye detection',
    'vision-test': 'Acuity test',
    retinal: 'Retinal imaging',
    'ai-analysis': 'Risk assessment',
    history: 'Prior screenings',
    report: 'Report',
    doctors: 'Hospital/Clinic',
    settings: 'Settings',
    signOut: 'Sign out',
    patient: 'Patient',
  },
  hi: {
    overview: 'अवलोकन',
    capture: 'कैप्चर',
    interpret: 'व्याख्या',
    act: 'क्रिया',
    dashboard: 'सारांश',
    profile: 'रोगी रिकॉर्ड',
    webcam: 'आंख का पता',
    'vision-test': 'दृष्टि परीक्षण',
    retinal: 'रेटिना इमेजिंग',
    'ai-analysis': 'जोखिम मूल्यांकन',
    history: 'पिछले स्क्रीनिंग',
    report: 'रिपोर्ट',
    doctors: 'अस्पताल/क्लिनिक',
    settings: 'सेटिंग्स',
    signOut: 'साइन आउट',
    patient: 'रोगी',
  },
} as const;

const getGroups = (language: 'en' | 'hi') => {
  const t = NAV_BY_LANGUAGE[language];
  return [
    {
      label: t.overview,
      items: [
        { id: 'dashboard', label: t.dashboard, icon: Activity },
        { id: 'profile', label: t.profile, icon: User },
      ],
    },
    {
      label: t.capture,
      items: [
        { id: 'webcam', label: t.webcam, icon: ScanFace },
        { id: 'vision-test', label: t['vision-test'], icon: Eye },
        { id: 'retinal', label: t.retinal, icon: Aperture },
      ],
    },
    {
      label: t.interpret,
      items: [
        { id: 'ai-analysis', label: t['ai-analysis'], icon: Waves },
        { id: 'history', label: t.history, icon: History },
        { id: 'report', label: t.report, icon: FileText },
      ],
    },
    {
      label: t.act,
      items: [
        { id: 'doctors', label: t.doctors, icon: Stethoscope },
      ],
    },
  ];
};

export const NAV_LABELS: Record<string, string> = {
  dashboard: 'Summary',
  profile: 'Patient record',
  webcam: 'Eye detection',
  'vision-test': 'Acuity test',
  retinal: 'Retinal imaging',
  'ai-analysis': 'Risk assessment',
  history: 'Prior screenings',
  report: 'Report',
  doctors: 'Hospital/Clinic',
};

export const getNavLabels = (language: SidebarLanguage = 'en') => {
  const t = NAV_BY_LANGUAGE[language];
  return Object.fromEntries(
    Object.entries(t).filter(([key]) => key !== 'settings' && key !== 'signOut' && key !== 'patient'),
  );
};

/** Top bar shown only on small screens, where the sidebar is a drawer. */
export function MobileBar({
  title,
  onOpenNav,
}: {
  title: string;
  onOpenNav: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line-soft bg-panel px-4 md:hidden">
      <button
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="-ml-1 rounded p-1.5 text-ink-2 transition-colors hover:text-ink"
      >
        <Menu size={19} strokeWidth={1.75} aria-hidden />
      </button>
      <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">{title}</span>
      <Wordmark compact />
    </header>
  );
}

function NavList({
  currentPage,
  onNavigate,
  compact,
  language,
}: {
  currentPage: string;
  onNavigate: (page: string) => void;
  compact: boolean;
  language: 'en' | 'hi';
}) {
  const groups = getGroups(language);
  return (
    <>
      {groups.map((group) => (
        <div key={group.label} className="mb-5 last:mb-0">
          {compact ? (
            <div className="mb-2 flex justify-center">
              <span className="font-mono text-[8px] leading-none tracking-[0.18em] text-ink-4 uppercase">
                {group.label}
              </span>
            </div>
          ) : (
            <div className="mb-1.5 px-2 font-mono text-micro tracking-[0.16em] text-ink-4 uppercase">
              {group.label}
            </div>
          )}
          {group.items.map((item) => {
            const active = currentPage === item.id;
            const Icon = item.icon;
            return (
              <div key={item.id} className="group relative">
                <button
                  onClick={() => onNavigate(item.id)}
                  title={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'mb-px flex w-full items-center rounded px-2 py-1.5 text-left text-sm transition-colors duration-150',
                    compact ? 'justify-center' : 'gap-2.5',
                    active
                      ? 'bg-raised font-semibold text-ink'
                      : 'font-medium text-ink hover:bg-raised/60 hover:text-ink',
                  )}
                >
                  <Icon size={15} strokeWidth={1.75} className="shrink-0" aria-hidden />
                  {!compact && <span className="truncate">{item.label}</span>}
                </button>
                {compact && (
                  <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-ground opacity-0 shadow-lg ring-1 ring-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                    {item.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

export default function Sidebar({
  currentPage,
  onNavigate,
  onLogout,
  patientName,
  patientImageUrl,
  mobileOpen,
  onMobileOpenChange,
  language,
  onLanguageChange,
  theme,
  onThemeChange,
  voiceEnabled,
  onVoiceToggle,
  settingsOpen,
  onSettingsOpenChange,
  sidebarOpen,
  onSidebarToggle,
}: SidebarProps & {
  language: SidebarLanguage;
  onLanguageChange: (lang: SidebarLanguage) => void;
  theme: SidebarTheme;
  onThemeChange: (theme: SidebarTheme) => void;
  voiceEnabled: boolean;
  onVoiceToggle: (enabled: boolean) => void;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
}) {
  const initials = patientName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  // Escape closes the drawer, and the body must not scroll behind it.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen, onMobileOpenChange]);

  const navigate = (page: string) => {
    onNavigate(page);
    onMobileOpenChange(false);
  };

  const t = NAV_BY_LANGUAGE[language];

  const footer = (
    <div className="border-t border-line-soft p-3">
      <div className={cx('flex items-center gap-2.5 px-1 py-1.5', sidebarOpen ? '' : 'justify-center')}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-ground font-mono text-micro text-ink-2">
          {patientImageUrl ? (
            <img src={patientImageUrl} alt={patientName} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        {sidebarOpen && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-ink">{patientName}</div>
            <div className="text-micro text-ink-4">{t.patient}</div>
          </div>
        )}
      </div>

      <div className="mt-2 space-y-1">
        <button
          onClick={() => onSettingsOpenChange(!settingsOpen)}
          className={cx(
            'flex w-full items-center rounded px-2 py-1.5 text-sm text-ink-4 transition-colors duration-150 hover:bg-raised hover:text-ink-2',
            sidebarOpen ? 'gap-2.5' : 'justify-center',
          )}
        >
          <Settings size={15} strokeWidth={1.75} className="shrink-0" aria-hidden />
          {sidebarOpen && t.settings}
        </button>

        {settingsOpen && (
          <div className="rounded border border-line-soft bg-ground p-2">
            <div className="mb-2 font-mono text-micro uppercase tracking-[0.12em] text-ink-4">
              Settings
            </div>

            <div className="mb-2">
              <div className="mb-1 text-micro uppercase tracking-[0.12em] text-ink-4">
                {language === 'hi' ? 'भाषा' : 'Language'}
              </div>
              <div className="space-y-1.5">
                {(['en', 'hi'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => onLanguageChange(lang)}
                    className={cx(
                      'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm transition-colors',
                      language === lang ? 'bg-raised text-ink' : 'text-ink-3 hover:bg-panel hover:text-ink-2',
                    )}
                  >
                    <span>{lang === 'en' ? 'English' : 'हिंदी'}</span>
                    {language === lang && <span className="text-ink">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-2">
              <div className="mb-1 text-micro uppercase tracking-[0.12em] text-ink-4">
                {language === 'hi' ? 'थीम' : 'Theme'}
              </div>
              <div className="flex gap-1.5">
                {(['dark', 'light'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onThemeChange(mode)}
                    className={cx(
                      'flex-1 rounded px-2 py-1.5 text-sm transition-colors',
                      theme === mode ? 'bg-raised text-ink' : 'text-ink-3 hover:bg-panel hover:text-ink-2',
                    )}
                  >
                    {mode === 'dark' ? (language === 'hi' ? 'डार्क' : 'Dark') : language === 'hi' ? 'लाइट' : 'Light'}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-sm text-ink-3 transition-colors hover:bg-panel hover:text-ink-2"
              >
                <LogOut size={15} strokeWidth={1.75} className="shrink-0" aria-hidden />
                {t.signOut}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Persistent rail, tablet and up */}
      <aside
        className={cx(
          'flex h-full shrink-0 flex-col border-r border-line-soft bg-panel max-md:hidden transition-all duration-200',
          sidebarOpen ? 'w-[232px]' : 'w-[78px]',
        )}
      >
        <div className={cx('flex h-16 items-center border-b border-line-soft px-3', sidebarOpen ? 'justify-start' : 'justify-center')}>
          <button
            type="button"
            onClick={onSidebarToggle}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
            className="flex items-center justify-center rounded transition-opacity hover:opacity-90"
          >
            <Wordmark compact={!sidebarOpen} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavList currentPage={currentPage} onNavigate={onNavigate} compact={!sidebarOpen} language={language} />
        </nav>
        {footer}
      </aside>

      {/* Drawer, phone */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close navigation"
            onClick={() => onMobileOpenChange(false)}
            className="absolute inset-0 bg-ground/75 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-[264px] max-w-[82vw] animate-rise flex-col border-r border-line bg-panel"
          >
            <div className="flex h-14 items-center justify-between border-b border-line-soft px-4">
              <Wordmark />
              <button
                onClick={() => onMobileOpenChange(false)}
                aria-label="Close navigation"
                className="rounded p-1.5 text-ink-3 transition-colors hover:text-ink"
              >
                <X size={18} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <NavList currentPage={currentPage} onNavigate={navigate} compact={false} language={language} />
            </nav>
            {footer}
          </div>
        </div>
      )}
    </>
  );
}
