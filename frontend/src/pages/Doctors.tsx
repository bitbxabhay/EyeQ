import { useState } from 'react';
import { ExternalLink, LocateFixed, MapPin, Navigation, Phone, Search, Star } from 'lucide-react';
import { Button, Eyebrow, Note, PageHeader, Tag } from '../components/ui';
import { searchDoctors, type PlaceDoctor } from '../lib/api';

interface DoctorsProps {
  onNavigate: (page: string) => void;
  language?: 'en' | 'hi';
}

const QUICK_QUERIES = ['Eye hospital', 'Retina specialist', 'Ophthalmologist', 'Optometrist', 'Eye clinic'];

export default function Doctors({ onNavigate, language = 'en' }: DoctorsProps) {
  const [location, setLocation] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [query, setQuery] = useState(language === 'hi' ? 'नेत्र अस्पताल' : 'Eye hospital');
  const [results, setResults] = useState<PlaceDoctor[] | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  const t = {
    eyebrow: language === 'hi' ? 'क्रिया' : 'Act',
    title: language === 'hi' ? 'अपने करीब अस्पताल/क्लिनिक खोजें' : 'Find a hospital/clinic near you',
    sub: language === 'hi'
      ? 'Google Maps से सही क्लिनिक, आपके बताए गए स्थान के आसपास।'
      : 'Real clinics from Google Maps, near wherever you tell it to look.',
    location: language === 'hi' ? 'शहर, क्षेत्र या पिनकोड — उदाहरण: रोहतक, हरियाणा' : 'City, area, or pincode — e.g. Rohtak, Haryana',
    search: language === 'hi' ? 'खोजें' : 'Search',
    nearMe: language === 'hi' ? 'मेरे पास' : 'Near me',
    error: language === 'hi'
      ? 'बैकएंड से संपर्क नहीं हो सका, या स्थान नहीं मिला। अधिक सही जगह लिखें (जैसे राज्य भी जोड़ें)।'
      : 'Could not reach the backend, or the location wasn’t found. Try a more specific place name (e.g. add the state).',
    empty: language === 'hi' ? 'ऊपर स्थान दर्ज करें और खोजें, ताकि वास्तविक क्लिनिक दिखाई दें।' : 'Enter a location above and search to see real clinics.',
    results: language === 'hi' ? 'परिणाम' : 'results near',
    nearby: language === 'hi' ? 'आसपास अस्पताल/क्लिनिक' : 'Nearby hospital/clinic',
    website: language === 'hi' ? 'वेबसाइट' : 'Website',
    map: language === 'hi' ? 'मानचित्र पर देखें' : 'View on map',
    openNow: language === 'hi' ? 'अभी खुला है' : 'Open now',
    closedNow: language === 'hi' ? 'अभी बंद है' : 'Closed now',
    nearest: language === 'hi' ? 'निकटतम' : 'Nearest',
    noResults: language === 'hi' ? 'इस खोज के लिए कोई परिणाम नहीं मिला' : 'No results for that search',
    tryBroader: language === 'hi' ? 'अधिक व्यापक स्थान लिखें, या "नेत्र अस्पताल" जैसा अलग क्वेरी आजमाएँ।' : 'Try a broader location, or a different query like "eye hospital".',
    source: language === 'hi' ? 'स्थान डेटा Google Maps से आता है।' : 'Location data comes from Google Maps.',
  };

  const runSearch = async () => {
    const cleanLocation = location.trim();
    if (!cleanLocation) return;
    setLocationLabel(cleanLocation);
    setResults(null);
    setState('loading');
    try {
      const res = await searchDoctors(query, cleanLocation, undefined, 20000);
      setResults(res.results);
      setState('idle');
    } catch {
      setState('error');
      setResults(null);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setState('error');
      return;
    }
    setState('loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await searchDoctors(query, '', {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setLocation('Near you');
          setResults(res.results);
          setState('idle');
        } catch {
          setState('error');
          setResults(null);
        }
      },
      (err) => {
        console.error('Geolocation error:', err.message);
        setState('error');
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 },
    );
  };
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-8 py-10 max-md:px-5">
        <PageHeader
          eyebrow={t.eyebrow}
          title={t.title}
          sub={t.sub}
        />

        {/* Search */}
        <div className="border-y border-line-soft py-4">
          <div className="mb-3 flex items-center gap-2.5">
            <MapPin size={15} strokeWidth={1.75} className="shrink-0 text-ink-4" aria-hidden />
            <input
              type="text"
              placeholder={t.location}
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setResults(null);
                setState('idle');
                if (!e.target.value.trim()) {
                  setLocationLabel('');
                } else {
                  setLocationLabel(e.target.value.trim());
                }
              }}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              aria-label="Location"
              className="w-full bg-transparent py-1 text-body text-ink outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            {QUICK_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuery(q);
                  if (location.trim()) runSearch();
                }}
                className={
                  query === q
                    ? 'rounded border border-ink-4 bg-raised px-2.5 py-1 text-sm text-ink transition-colors'
                    : 'rounded border border-line-soft px-2.5 py-1 text-sm text-ink-3 transition-colors hover:border-line hover:text-ink-2'
                }
              >
                {q}
              </button>
            ))}
            <span aria-hidden className="mx-1 h-4 w-px bg-line-soft" />
            <Button variant="secondary" size="sm" onClick={runSearch} disabled={state === 'loading'}>
              <Search size={13} strokeWidth={2} aria-hidden />
              {t.search}
            </Button>
            <Button variant="secondary" size="sm" onClick={useMyLocation} disabled={state === 'loading'}>
              <LocateFixed size={13} strokeWidth={2} aria-hidden />
              {t.nearMe}
            </Button>
          </div>
        </div>

        {state === 'error' && (
          <div className="mt-6">
            <Note tone="caution">
              {t.error}
            </Note>
          </div>
        )}

        {results === null && state === 'idle' && <p className="mt-8 text-sm text-ink-3">{t.empty}</p>}

        {results !== null && (
          <>
            <div className="mt-4 mb-2">
              <Eyebrow>
                {results.length} {t.results} "{locationLabel || location || t.nearMe}"
              </Eyebrow>
            </div>
            <ul className="border-t border-line-soft">
              {results.map((doc, index) => {
                const distanceText =
                  doc.distance_km != null
                    ? language === 'hi'
                      ? `${doc.distance_km.toFixed(1)} किमी दूर`
                      : `${doc.distance_km.toFixed(1)} km away`
                    : t.nearby;

                return (
                  <li key={doc.place_id} className="border-b border-line-soft py-5">
                    <div className="flex gap-4 max-sm:flex-col">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-4">
                          <div className="min-w-0 text-body font-medium text-ink">{doc.name}</div>
                          {doc.rating != null && (
                            <div className="flex shrink-0 items-center gap-1.5">
                              <Star size={13} strokeWidth={1.75} className="text-ink-3" aria-hidden />
                              <span className="tnum font-mono text-sm text-ink">{doc.rating}</span>
                              {doc.reviews != null && (
                                <span className="tnum font-mono text-micro text-ink-4">({doc.reviews})</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {index === 0 && <Tag>{language === 'hi' ? 'निकटतम' : 'Nearest'}</Tag>}
                          <span className="text-sm text-ink-3">{distanceText}</span>
                        </div>

                        <div className="mt-2 flex items-start gap-1.5 text-sm text-ink-2">
                          <MapPin size={13} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-4" aria-hidden />
                          {doc.address}
                        </div>

                        {doc.phone && (
                          <div className="mt-1 flex items-center gap-1.5 text-sm text-ink-2">
                            <Phone size={13} strokeWidth={1.75} className="shrink-0 text-ink-4" aria-hidden />
                            {doc.phone}
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {doc.open_now != null && <Tag>{doc.open_now ? t.openNow : t.closedNow}</Tag>}
                            {doc.website && (
                              <a
                                href={doc.website}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"
                              >
                                {t.website} <ExternalLink size={12} strokeWidth={2} aria-hidden />
                              </a>
                            )}
                          </div>
                          {doc.lat != null && doc.lng != null && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${doc.lat},${doc.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded border border-line px-2.5 py-1.5 text-sm text-ink-2 transition-colors hover:border-ink-4 hover:text-ink"
                            >
                              <Navigation size={13} strokeWidth={1.75} aria-hidden />
                              {t.map}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {results.length === 0 && (
              <div className="border-b border-line-soft py-14 text-center">
                <div className="mb-1.5 text-body text-ink">{t.noResults}</div>
                <p className="mx-auto max-w-sm text-sm text-ink-3">{t.tryBroader}</p>
              </div>
            )}
          </>
        )}

        <p className="mt-6 text-sm text-ink-4">{t.source}</p>
      </div>
    </div>
  );
}
