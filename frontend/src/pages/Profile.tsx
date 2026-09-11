import { useState } from 'react';
import { Check, X } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { Button, Eyebrow, Field, PageHeader, SectionRule, SelectField } from '../components/ui';
import { currentPatient } from '../data/mockData';

interface ProfileProps {
  patientName: string;
  patientEmail?: string;
  patientImageUrl?: string | null;
  language?: 'en' | 'hi';
}

const privacy = [
  { label: 'Webcam video', desc: 'Processed frame by frame in your browser. No video leaves the device.' },
  { label: 'Screening results', desc: 'Held for this session only. Export a report to keep them.' },
  { label: 'Retinal images', desc: 'Analysed locally in this demo build. Not uploaded.' },
];

const privacyHi = [
  { label: 'वेबकैम वीडियो', desc: 'ब्राउज़र में फ्रेम-दर-फ्रेम प्रोसेस किया जाता है। वीडियो डिवाइस से बाहर नहीं जाता।' },
  { label: 'स्क्रीनिंग परिणाम', desc: 'केवल इस सत्र के लिए रखा जाता है। उन्हें रखने के लिए रिपोर्ट एक्सपोर्ट करें।' },
  { label: 'रेटिना इमेज', desc: 'इस डेमो बिल्ड में लोकली एनालाइज़ की जाती है। अपलोड नहीं होती।' },
];

export default function Profile({ patientName, patientEmail, patientImageUrl, language = 'en' }: ProfileProps) {
  const [saved, setSaved] = useState(false);
  const t = {
    eyebrow: language === 'hi' ? 'रिकॉर्ड' : 'Record',
    title: language === 'hi' ? 'रोगी रिकॉर्ड' : 'Patient record',
    sub: language === 'hi' ? 'जो जोखिम मॉडल आपके बारे में जानता है। उसे अपडेट रखना मूल्यांकन को सही बनाता है।' : 'What the risk model knows about you. Keeping it current keeps the assessment honest.',
    born: language === 'hi' ? 'जन्मतारीख' : 'Born',
    screenings: language === 'hi' ? 'स्क्रीनिंग' : 'Screenings',
    details: language === 'hi' ? 'विवरण' : 'Details',
    fullName: language === 'hi' ? 'पूरा नाम' : 'Full name',
    dob: language === 'hi' ? 'जन्मतारीख' : 'Date of birth',
    gender: language === 'hi' ? 'लिंग' : 'Gender',
    email: language === 'hi' ? 'ईमेल' : 'Email',
    phone: language === 'hi' ? 'फोन' : 'Phone',
    preferredLanguage: language === 'hi' ? 'पसंदीदा भाषा' : 'Preferred language',
    visitReason: language === 'hi' ? 'यात्रा का कारण' : 'Visit reason',
    conditions: language === 'hi' ? 'रिकॉर्ड में आंख की स्थितियाँ' : 'Eye conditions on record',
    nothing: language === 'hi' ? 'कुछ रिकॉर्ड नहीं है।' : 'Nothing recorded.',
    meds: language === 'hi' ? 'वर्तमान दवाएँ' : 'Current medications',
    privacy: language === 'hi' ? 'आपका डेटा कहाँ जाता है' : 'Where your data goes',
    save: language === 'hi' ? 'परिवर्तनों को सेव करें' : 'Save changes',
    saved: language === 'hi' ? 'सेव हो गया' : 'Saved',
    localOnly: language === 'hi' ? 'केवल इस डिवाइस पर संग्रहीत' : 'Stored on this device only',
    webcam: language === 'hi' ? 'वेबकैम वीडियो' : 'Webcam video',
    results: language === 'hi' ? 'स्क्रीनिंग परिणाम' : 'Screening results',
    retina: language === 'hi' ? 'रेटिना इमेज' : 'Retinal images',
    day: language === 'hi' ? 'दिन' : 'Day',
    month: language === 'hi' ? 'माह' : 'Month',
    year: language === 'hi' ? 'साल' : 'Year',
  };
  const [patient, setPatient] = useState(() => {
    const stored = localStorage.getItem('eyecare-patient-record');
    let savedPatient = {};
    try {
      savedPatient = stored ? JSON.parse(stored) : {};
    } catch {
      localStorage.removeItem('eyecare-patient-record');
    }
    return {
      ...currentPatient,
      ...savedPatient,
      name: savedPatient.name || patientName,
      email: savedPatient.email || patientEmail || currentPatient.email,
    };
  });

  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);
  const monthOptions = [
    { value: '01', label: language === 'hi' ? 'जनवरी' : 'January' },
    { value: '02', label: language === 'hi' ? 'फ़रवरी' : 'February' },
    { value: '03', label: language === 'hi' ? 'मार्च' : 'March' },
    { value: '04', label: language === 'hi' ? 'अप्रैल' : 'April' },
    { value: '05', label: language === 'hi' ? 'मई' : 'May' },
    { value: '06', label: language === 'hi' ? 'जून' : 'June' },
    { value: '07', label: language === 'hi' ? 'जुलाई' : 'July' },
    { value: '08', label: language === 'hi' ? 'अगस्त' : 'August' },
    { value: '09', label: language === 'hi' ? 'सितंबर' : 'September' },
    { value: '10', label: language === 'hi' ? 'अक्टूबर' : 'October' },
    { value: '11', label: language === 'hi' ? 'नवंबर' : 'November' },
    { value: '12', label: language === 'hi' ? 'दिसंबर' : 'December' },
  ];
  const currentDob = patient.dob || '1988-04-12';
  const [yearValue, monthValue, dayValue] = currentDob.split('-');

  const updateDobPart = (part: 'day' | 'month' | 'year', value: string) => {
    const nextDob = {
      year: part === 'year' ? value : yearValue || '1988',
      month: part === 'month' ? value : monthValue || '04',
      day: part === 'day' ? value : dayValue || '12',
    };
    setPatient({ ...patient, dob: `${nextDob.year}-${nextDob.month}-${nextDob.day}` });
  };

  const handleSave = () => {
    localStorage.setItem('eyecare-patient-record', JSON.stringify(patient));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const removeCondition = (c: string) =>
    setPatient({ ...patient, conditions: patient.conditions.filter((x) => x !== c) });

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-8 py-10 max-md:px-5">
        <PageHeader
          eyebrow={t.eyebrow}
          title={t.title}
          sub={t.sub}
        />

        {/* Identity */}
        <div className="flex items-center gap-5 border-y border-line-soft py-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-panel font-mono text-body text-ink-2">
            {patientImageUrl ? (
              <img src={patientImageUrl} alt={patient.name} className="h-full w-full object-cover" />
            ) : (
              patient.name
                .split(' ')
                .map((n) => n[0])
                .join('')
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-head font-medium tracking-[-0.01em] text-ink">{patient.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="tnum font-mono text-sm text-ink-3">
                {t.born}{' '}
                {new Date(`${patient.dob}T00:00:00`).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <RiskBadge level={patient.riskLevel} />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="tnum font-mono text-title text-ink">{patient.totalScreenings}</div>
            <div className="font-mono text-micro uppercase tracking-[0.12em] text-ink-4">{t.screenings}</div>
          </div>
        </div>

        {/* Details */}
        <div className="mt-10">
          <SectionRule>{t.details}</SectionRule>
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <div className="col-span-2 max-sm:col-span-1">
              <Field
                label={t.fullName}
                type="text"
                value={patient.name}
                onChange={(e) => setPatient({ ...patient, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div className="font-mono text-label uppercase tracking-[0.14em] text-ink-3">{t.dob}</div>
              <div className="grid grid-cols-3 gap-2">
                <SelectField label={t.day} value={dayValue || '12'} onChange={(e) => updateDobPart('day', e.target.value)}>
                  {dayOptions.map((day) => (
                    <option key={day} value={String(day).padStart(2, '0')}>{String(day).padStart(2, '0')}</option>
                  ))}
                </SelectField>
                <SelectField label={t.month} value={monthValue || '04'} onChange={(e) => updateDobPart('month', e.target.value)}>
                  {monthOptions.map((month) => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </SelectField>
                <SelectField label={t.year} value={yearValue || '1988'} onChange={(e) => updateDobPart('year', e.target.value)}>
                  {Array.from({ length: 80 }, (_, index) => 1950 + index).map((year) => (
                    <option key={year} value={String(year)}>{year}</option>
                  ))}
                </SelectField>
              </div>
            </div>

            <SelectField label={t.gender} value={patient.gender} onChange={(e) => setPatient({ ...patient, gender: e.target.value })}>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </SelectField>

            <Field
              label={t.email}
              type="email"
              value={patient.email}
              onChange={(e) => setPatient({ ...patient, email: e.target.value })}
            />
            <Field
              label={t.phone}
              type="tel"
              value={patient.phone}
              onChange={(e) => setPatient({ ...patient, phone: e.target.value })}
            />
            <SelectField label={t.preferredLanguage} value={patient.preferredLanguage || 'English'} onChange={(e) => setPatient({ ...patient, preferredLanguage: e.target.value })}>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Spanish">Spanish</option>
              <option value="Arabic">Arabic</option>
            </SelectField>
            <SelectField label={t.visitReason} value={patient.visitReason || 'Blurred vision'} onChange={(e) => setPatient({ ...patient, visitReason: e.target.value })}>
              <option value="Blurred vision">Blurred vision</option>
              <option value="Routine eye check">Routine eye check</option>
              <option value="Eye pain">Eye pain</option>
              <option value="Dry eyes">Dry eyes</option>
              <option value="Headaches with screen use">Headaches with screen use</option>
            </SelectField>
          </div>
        </div>

        {/* History */}
        <div className="mt-10">
          <SectionRule>{t.conditions}</SectionRule>
          <ul>
            {patient.conditions.map((c) => (
              <li
                key={c}
                className="flex items-center justify-between gap-4 border-b border-line-soft py-2.5 last:border-0"
              >
                <span className="text-body text-ink-2">{c}</span>
                <button
                  onClick={() => removeCondition(c)}
                  aria-label={`Remove ${c}`}
                  className="shrink-0 rounded p-1 text-ink-4 transition-colors hover:text-high"
                >
                  <X size={14} strokeWidth={1.75} aria-hidden />
                </button>
              </li>
            ))}
            {patient.conditions.length === 0 && (
              <li className="py-2.5 text-body text-ink-4">{t.nothing}</li>
            )}
          </ul>
        </div>

        <div className="mt-10">
          <SectionRule>{t.meds}</SectionRule>
          <ul>
            {patient.medications.map((m) => (
              <li key={m} className="border-b border-line-soft py-2.5 text-body text-ink-2 last:border-0">
                {m}
              </li>
            ))}
          </ul>
        </div>

        {/* Privacy */}
        <div className="mt-10">
          <SectionRule>{t.privacy}</SectionRule>
          <ul className="space-y-3.5">
            {(language === 'hi' ? privacyHi : privacy).map((p) => (
              <li key={p.label} className="flex gap-3">
                <Check
                  size={15}
                  strokeWidth={2}
                  aria-hidden
                  className="mt-0.5 shrink-0 text-low"
                />
                <div>
                  <div className="text-body text-ink">{p.label}</div>
                  <div className="mt-0.5 text-sm text-ink-3">{p.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex items-center gap-4 border-t border-line-soft pt-6">
          <Button variant="primary" onClick={handleSave}>
            {t.save}
          </Button>
          {saved && (
            <span className="flex animate-rise items-center gap-1.5 text-sm text-low">
              <Check size={14} strokeWidth={2} aria-hidden />
              {t.saved}
            </span>
          )}
          {!saved && <Eyebrow>{t.localOnly}</Eyebrow>}
        </div>
      </div>
    </div>
  );
}
