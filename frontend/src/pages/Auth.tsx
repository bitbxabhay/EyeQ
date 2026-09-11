import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Wordmark } from '../components/Logo';
import { Button, Eyebrow, Field, Note } from '../components/ui';

interface AuthProps {
  onLogin: () => void;
  onBack: () => void;
}

export default function Auth({ onLogin, onBack }: AuthProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const t = {
    back: 'Back',
    signIn: 'Sign in',
    create: 'Create an account',
    descLogin: 'Pick up where your last screening left off.',
    descRegister: 'Your record stays on this device unless you export it.',
    register: 'Register',
    fullName: 'Full name',
    email: 'Email',
    password: 'Password',
    createBtn: 'Create account',
    signing: 'Signing in',
    demo: 'Demo',
    note: 'Credentials are pre-filled. Nothing is sent anywhere — sign in to walk the flow.',
    disclaimer: 'By continuing you acknowledge this is an assisted screening tool, not a substitute for professional medical advice.',
  };
  const [form, setForm] = useState({ name: '', email: 'demo@eyecare.ai', password: 'demo' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 700);
  };

  return (
    <div className="flex min-h-full flex-col bg-ground">
      <header className="flex h-16 items-center border-b border-line-soft px-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={1.75} aria-hidden />
          {t.back}
        </button>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-14">
        <div className="w-full max-w-[360px]">
          <Wordmark />

          <h1 className="mt-8 mb-1.5 text-title font-semibold tracking-[-0.02em] text-ink">
            {tab === 'login' ? t.signIn : t.create}
          </h1>
          <p className="mb-8 text-sm text-ink-3">
            {tab === 'login' ? t.descLogin : t.descRegister}
          </p>

          <div className="mb-6 flex gap-5 border-b border-line-soft">
            {(['login', 'register'] as const).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                className={
                  tab === tabKey
                    ? '-mb-px border-b border-ink pb-2.5 text-sm font-medium text-ink'
                    : '-mb-px border-b border-transparent pb-2.5 text-sm text-ink-3 transition-colors hover:text-ink-2'
                }
              >
                {tabKey === 'login' ? t.signIn : t.register}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <Field
                label={t.fullName}
                type="text"
                placeholder="Jordan Alvarez"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            )}
            <Field
              label={t.email}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Field
              label={t.password}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <Button type="submit" variant="primary" disabled={loading} className="w-full">
              {loading ? t.signing : tab === 'login' ? t.signIn : t.createBtn}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="flex items-baseline gap-3">
              <Eyebrow className="shrink-0 pt-px">{t.demo}</Eyebrow>
              <p className="text-sm text-ink-3">{t.note}</p>
            </div>
            <Note>{t.disclaimer}</Note>
          </div>
        </div>
      </div>
    </div>
  );
}
