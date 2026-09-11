import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardList, Clock3, Stethoscope } from 'lucide-react';
import { Button, Eyebrow, Note, PageHeader, Panel, SectionRule } from '../components/ui';
import { fetchReferrals, updateReferral, type ReferralCase } from '../lib/api';

interface DoctorPortalProps {
  onNavigate: (page: string) => void;
  language?: 'en' | 'hi';
}

const badgeTone: Record<string, string> = {
  pending: 'var(--color-moderate)',
  accepted: 'var(--color-low)',
  'follow-up': 'var(--color-ink-3)',
  rejected: 'var(--color-high)',
};

export default function DoctorPortal({ onNavigate, language = 'en' }: DoctorPortalProps) {
  const [cases, setCases] = useState<ReferralCase[]>([]);
  const [loading, setLoading] = useState(true);
  const t = {
    eyebrow: language === 'hi' ? 'क्रिया' : 'Act',
    title: language === 'hi' ? 'डॉक्टर रेकोमेंडेशन' : 'Doctor recommendation',
    sub: language === 'hi' ? 'स्क्रीनिंग परिणामों को डॉक्टर के लिए साफ़ सिफारिश में बदलने वाला पैनल।' : 'Doctor-ready recommendation panel for screening results and follow-up decisions.',
    open: language === 'hi' ? 'क्लिनिक खोजें' : 'Find clinic',
    loading: language === 'hi' ? 'सिफारिशें लोड हो रही हैं…' : 'Loading recommendations…',
    none: language === 'hi' ? 'अभी कोई सिफारिश नहीं है' : 'No recommendations yet',
    noneSub: language === 'hi' ? 'स्क्रीनिंग पूरा होने के बाद डॉक्टर की सिफारिशें यहाँ दिखाई देंगी।' : 'Doctor recommendations from completed screenings will appear here after they are created.',
    summary: language === 'hi' ? 'नैदानिक सारांश' : 'Clinical summary',
    noSummary: language === 'hi' ? 'कोई सारांश नहीं दिया गया।' : 'No summary provided.',
    rec: language === 'hi' ? 'सिफारिश' : 'Recommendation',
    noRec: language === 'hi' ? 'कोई सिफारिश नहीं दी गई।' : 'No recommendation provided.',
    accept: language === 'hi' ? 'स्वीकारें' : 'Accept',
    follow: language === 'hi' ? 'फॉलो-अप' : 'Follow-up',
    reject: language === 'hi' ? 'अस्वीकारें' : 'Reject',
    note: language === 'hi' ? 'यह रेकोमेंडेशन पैनल डॉक्टर को निर्णय लेने में मदद करता है, अंतिम निदान नहीं।' : 'This recommendation panel helps clinicians triage screening outcomes, not final diagnosis.',
  };

  const load = async () => {
    try {
      const data = await fetchReferrals();
      setCases(data);
    } catch {
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: ReferralCase['status']) => {
    await updateReferral(id, status, `Reviewed by ophthalmology portal (${status})`);
    await load();
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-10 max-md:px-5">
        <PageHeader
          eyebrow={t.eyebrow}
          title={t.title}
          sub={t.sub}
        />

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={() => onNavigate('doctors')}>
            {t.open}
            <ArrowRight size={15} strokeWidth={2} aria-hidden />
          </Button>
        </div>

        {loading ? (
          <Panel className="p-6">
            <div className="text-sm text-ink-3">{t.loading}</div>
          </Panel>
        ) : cases.length === 0 ? (
          <Panel className="p-6">
            <div className="mb-2 flex items-center gap-2 text-ink">
              <ClipboardList size={16} strokeWidth={1.8} aria-hidden />
              <span className="font-medium">{t.none}</span>
            </div>
            <p className="text-sm text-ink-3">{t.noneSub}</p>
          </Panel>
        ) : (
          <div className="space-y-5">
            {cases.map((item) => (
              <Panel key={item.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-body font-medium text-ink">{item.patient_name}</div>
                    <div className="mt-1 font-mono text-micro tracking-[0.12em] text-ink-4 uppercase">
                      {item.patient_age ? `${item.patient_age} yrs` : 'Age not provided'} · {item.risk_level}
                    </div>
                  </div>
                  <span
                    className="rounded-full border px-2.5 py-1 font-mono text-micro tracking-[0.12em] uppercase"
                    style={{ borderColor: badgeTone[item.status] || 'var(--color-line)', color: badgeTone[item.status] || 'var(--color-ink)' }}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <Eyebrow className="mb-2">{t.summary}</Eyebrow>
                    <p className="text-sm leading-relaxed text-ink-2">{item.summary || t.noSummary}</p>
                  </div>
                  <div>
                    <Eyebrow className="mb-2">{t.rec}</Eyebrow>
                    <p className="text-sm leading-relaxed text-ink-2">{item.recommendation || t.noRec}</p>
                  </div>
                </div>

                <div className="mt-4 border-t border-line-soft pt-4 text-sm text-ink-3">
                  <div className="flex flex-wrap gap-4">
                    <span className="inline-flex items-center gap-1.5">
                      <Stethoscope size={13} strokeWidth={1.8} aria-hidden />
                      {item.doctor_name}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 size={13} strokeWidth={1.8} aria-hidden />
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => updateStatus(item.id, 'accepted')}>
                    <CheckCircle2 size={13} strokeWidth={2} aria-hidden />
                    {t.accept}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => updateStatus(item.id, 'follow-up')}>
                    {t.follow}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => updateStatus(item.id, 'rejected')}>
                    {t.reject}
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
        )}

        <div className="mt-8">
          <Note tone="caution">{t.note}</Note>
        </div>
      </div>
    </div>
  );
}
