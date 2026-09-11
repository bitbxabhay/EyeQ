import type { Doctor, ScreeningSession, RiskLevel } from '../data/mockData';

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8001';

/** Wired up once in App.tsx (inside ClerkProvider) via setAuthTokenGetter, so
 * plain functions here can still attach `Authorization: Bearer <token>`
 * without needing to be React hooks themselves. */
let getAuthToken: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(fn: () => Promise<string | null>) {
  getAuthToken = fn;
}

async function authHeader(): Promise<Record<string, string>> {
  const token = getAuthToken ? await getAuthToken() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const auth = await authHeader();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...auth,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API error ${res.status} on ${path}: ${body || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/* --------------------------------------------------------------- retinal */

export interface PredictResult {
  grade: number;
  label: string;
  description: string;
  severity: number;
  refer: boolean;
  confidence: number;
  confidence_label: string;
  recommendation: string;
  quality: {
    is_good: boolean;
    score: number;
    brightness: number;
    contrast: number;
    center_contrast: number;
    status: 'good' | 'poor';
    reason: string;
  };
  lesions: {
    count: number;
    level: string;
    summary: string;
  };
  clinical_flags: string[];
  heatmap: string; // data:image/png;base64,...
  dataset?: string;
  model_family?: string;
  grade_explanation?: string;
  metrics: {
    aptos_kappa?: number;
    sensitivity?: number;
    specificity?: number;
    [key: string]: unknown;
  };
}

export async function predictImage(file: File): Promise<PredictResult> {
  const form = new FormData();
  form.append('file', file);
  const auth = await authHeader();
  const res = await fetch(`${API_BASE}/predict`, { method: 'POST', body: form, headers: auth });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Model server error (${res.status}): ${body || res.statusText}`);
  }
  return res.json();
}

/* ------------------------------------------------------------ screenings */

export interface Factor {
  label: string;
  weight: number; // positive raises risk, negative lowers it
  category: string;
}

/** What the frontend sends when it wants to persist a completed assessment. */
export interface ScreeningIn {
  type: string;
  status?: 'Complete' | 'Partial';
  va_od?: string | null;
  va_os?: string | null;
  retinal_grade?: number | null;
  retinal_label?: string | null;
  retinal_refer?: boolean | null;
  overall_score: number;
  risk_level: RiskLevel;
  conditions: string[];
  factors: Factor[];
  summary: string;
  recommendation: string;
}

/** Raw shape returned by the backend for a saved screening. */
export interface ScreeningRecord extends ScreeningIn {
  id: string;
  created_at: string;
}

export function saveScreening(body: ScreeningIn) {
  return req<ScreeningRecord>('/api/screenings', { method: 'POST', body: JSON.stringify(body) });
}

export function fetchScreenings() {
  return req<ScreeningRecord[]>('/api/screenings');
}

export function fetchScreening(id: string) {
  return req<ScreeningRecord>(`/api/screenings/${id}`);
}

export interface DashboardSummary {
  latest: ScreeningRecord | null;
  total: number;
  low_risk_count: number;
  recent: ScreeningRecord[];
}

export function fetchDashboard() {
  return req<DashboardSummary>('/api/dashboard');
}

export interface DiabetesProfile {
  diabetes_history: 'yes' | 'no' | 'unsure' | 'prefer-not-to-say' | null;
  diabetes_duration: 'under-1' | '1-5' | '5-10' | '10-15' | 'over-15' | 'custom' | 'unsure' | null;
  diabetes_duration_value: number | null;
  diabetes_duration_unit: 'years' | 'months' | null;
  recent_diabetic_eye_exam: 'yes' | 'no' | 'unsure' | null;
}

export function fetchDiabetesProfile() {
  return req<DiabetesProfile>('/api/profile/diabetes');
}

export function saveDiabetesProfile(body: DiabetesProfile) {
  return req<DiabetesProfile>('/api/profile/diabetes', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/** Adapts a backend screening record to the shape the existing UI (Dashboard,
 * History) was built around, so those components need minimal changes. */
export function toScreeningSession(r: ScreeningRecord): ScreeningSession {
  return {
    id: r.id,
    date: r.created_at.slice(0, 10),
    type: r.type,
    riskLevel: r.risk_level,
    vaOD: r.va_od ?? '—',
    vaOS: r.va_os ?? '—',
    overallScore: r.overall_score,
    status: r.status ?? 'Complete',
    conditions: r.conditions,
  };
}

/* ---------------------------------------------------------------- doctors */

export interface PlaceDoctor {
  place_id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviews: number | null;
  phone: string | null;
  open_now: boolean | null;
  website: string | null;
  types: string[];
  distance_km?: number | null;
}

export interface DoctorSearchResponse {
  source: 'google';
  results: PlaceDoctor[];
  error?: string;
}

export function searchDoctors(
  query: string,
  location: string,
  coords?: { lat: number; lng: number },
  radiusMeters?: number,
) {
  const params = new URLSearchParams({ query, location });
  if (coords) {
    params.set('lat', String(coords.lat));
    params.set('lng', String(coords.lng));
  }
  if (radiusMeters) {
    params.set('radius_m', String(radiusMeters));
  }
  return req<DoctorSearchResponse>(`/api/doctors/search?${params.toString()}`);
}

export function fetchDoctors() {
  return req<Doctor[]>('/api/doctors');
}

/* ----------------------------------------------------------- appointments */

export interface AppointmentIn {
  place_id?: string | null;
  doctor_name: string;
  clinic: string;
  location: string;
  phone?: string | null;
  date: string;
  time: string;
  reason: string;
}

export interface AppointmentRecord extends AppointmentIn {
  id: string;
  created_at: string;
}

export function bookAppointment(body: AppointmentIn) {
  return req<AppointmentRecord>('/api/appointments', { method: 'POST', body: JSON.stringify(body) });
}

export function fetchAppointments() {
  return req<AppointmentRecord[]>('/api/appointments');
}

export interface ReferralCase {
  id: string;
  patient_name: string;
  patient_age?: string | null;
  risk_level: string;
  summary: string;
  recommendation: string;
  status: 'pending' | 'accepted' | 'follow-up' | 'rejected';
  doctor_name: string;
  clinic: string;
  location: string;
  created_at: string;
  reviewed_at?: string | null;
  review_note?: string | null;
}

export function fetchReferrals() {
  return req<ReferralCase[]>('/api/referrals');
}

export function createReferral(body: Omit<ReferralCase, 'id' | 'created_at' | 'reviewed_at' | 'review_note'>) {
  return req<ReferralCase>('/api/referrals', { method: 'POST', body: JSON.stringify(body) });
}

export function updateReferral(id: string, status: ReferralCase['status'], review_note?: string) {
  return req<ReferralCase>(`/api/referrals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, review_note }),
  });
}

