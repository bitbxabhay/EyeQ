export type RiskLevel = 'Low' | 'Medium' | 'High';
export type Specialty = 'Ophthalmologist' | 'Optometrist' | 'Retina Specialist';
export type ConsultationType = 'In-person' | 'Telehealth' | 'Both';

export interface Doctor {
  id: string;
  name: string;
  specialty: Specialty;
  clinic: string;
  location: string;
  rating: number;
  reviews: number;
  initials: string;
  avatarColor: string;
  availableSlots: { date: string; times: string[] }[];
  consultationType: ConsultationType;
  experience: number;
  bio: string;
}

export interface ScreeningSession {
  id: string;
  date: string;
  type: string;
  riskLevel: RiskLevel;
  vaOD: string;
  vaOS: string;
  overallScore: number;
  status: 'Complete' | 'Partial';
  conditions: string[];
}

export interface Patient {
  name: string;
  dob: string;
  gender: string;
  email: string;
  phone: string;
  conditions: string[];
  medications: string[];
  lastScreening: string;
  totalScreenings: number;
  riskLevel: RiskLevel;
  preferredLanguage?: string;
  visitReason?: string;
  insurance?: string;
  notes?: string;
}

export const currentPatient: Patient = {
  name: 'Jordan Alvarez',
  dob: '1988-04-12',
  gender: 'Non-binary',
  email: 'jordan.alvarez@email.com',
  phone: '+1 (415) 555-0194',
  conditions: ['Myopia', 'Family history of glaucoma'],
  medications: ['Lisinopril 10mg'],
  lastScreening: '2026-08-15',
  totalScreenings: 4,
  riskLevel: 'Medium',
  preferredLanguage: 'English',
  visitReason: 'Blurred vision',
  insurance: 'Blue Cross PPO',
  notes: 'Wears glasses intermittently and has a family history of retinal disease.',
};

export const doctors: Doctor[] = [
  {
    id: 'd1',
    name: 'Dr. Sarah Chen',
    specialty: 'Ophthalmologist',
    clinic: 'Pacific Vision Center',
    location: 'San Francisco, CA',
    rating: 4.9,
    reviews: 247,
    initials: 'SC',
    avatarColor: '#1A4A6B',
    availableSlots: [
      { date: '2026-09-02', times: ['09:00', '11:30', '14:00'] },
      { date: '2026-09-04', times: ['10:00', '15:30'] },
      { date: '2026-09-08', times: ['09:30', '13:00', '16:00'] },
    ],
    consultationType: 'Both',
    experience: 15,
    bio: 'Board-certified ophthalmologist specializing in comprehensive eye care and corneal diseases.',
  },
  {
    id: 'd2',
    name: 'Dr. Marcus Webb',
    specialty: 'Retina Specialist',
    clinic: 'Advanced Retinal Institute',
    location: 'Los Angeles, CA',
    rating: 4.8,
    reviews: 189,
    initials: 'MW',
    avatarColor: '#2D1A6B',
    availableSlots: [
      { date: '2026-09-03', times: ['11:00', '14:30'] },
      { date: '2026-09-05', times: ['10:00', '15:00'] },
      { date: '2026-09-09', times: ['09:00', '12:00'] },
    ],
    consultationType: 'In-person',
    experience: 22,
    bio: 'Fellowship-trained retina specialist with expertise in diabetic retinopathy and macular degeneration.',
  },
  {
    id: 'd3',
    name: 'Dr. Priya Sharma',
    specialty: 'Optometrist',
    clinic: 'ClearVision Optical',
    location: 'New York, NY',
    rating: 4.7,
    reviews: 312,
    initials: 'PS',
    avatarColor: '#1A6B4A',
    availableSlots: [
      { date: '2026-09-02', times: ['10:00', '14:00', '16:00'] },
      { date: '2026-09-03', times: ['09:00', '13:00'] },
      { date: '2026-09-05', times: ['11:00', '15:00'] },
    ],
    consultationType: 'Both',
    experience: 8,
    bio: 'Comprehensive optometrist specializing in refractive errors, contact lens fitting, and pediatric eye care.',
  },
  {
    id: 'd4',
    name: 'Dr. Aiden Park',
    specialty: 'Ophthalmologist',
    clinic: 'EyeHealth Partners',
    location: 'Chicago, IL',
    rating: 4.8,
    reviews: 203,
    initials: 'AP',
    avatarColor: '#6B3A1A',
    availableSlots: [
      { date: '2026-09-04', times: ['09:30', '14:30'] },
      { date: '2026-09-07', times: ['10:00', '13:30', '16:30'] },
    ],
    consultationType: 'Telehealth',
    experience: 12,
    bio: 'Glaucoma specialist with extensive experience in minimally invasive glaucoma surgery (MIGS).',
  },
  {
    id: 'd5',
    name: 'Dr. Fatima Al-Hassan',
    specialty: 'Retina Specialist',
    clinic: 'Vision Research Center',
    location: 'Boston, MA',
    rating: 4.9,
    reviews: 156,
    initials: 'FA',
    avatarColor: '#1A5A6B',
    availableSlots: [
      { date: '2026-09-05', times: ['09:00', '12:00'] },
      { date: '2026-09-10', times: ['14:00', '16:00'] },
    ],
    consultationType: 'Both',
    experience: 18,
    bio: 'Expert in age-related macular degeneration and inherited retinal diseases, with over 50 published studies.',
  },
  {
    id: 'd6',
    name: 'Dr. Carlos Rivera',
    specialty: 'Optometrist',
    clinic: 'Neighborhood Eye Care',
    location: 'Miami, FL',
    rating: 4.6,
    reviews: 428,
    initials: 'CR',
    avatarColor: '#4A6B1A',
    availableSlots: [
      { date: '2026-09-02', times: ['08:30', '10:30', '14:00', '16:00'] },
      { date: '2026-09-03', times: ['09:00', '11:00', '15:00'] },
      { date: '2026-09-04', times: ['10:00', '14:30'] },
    ],
    consultationType: 'In-person',
    experience: 10,
    bio: 'Primary eye care provider focused on preventive eye health and low vision rehabilitation.',
  },
];

export const screeningHistory: ScreeningSession[] = [
  {
    id: 's1',
    date: '2026-08-15',
    type: 'Full Screening',
    riskLevel: 'Medium',
    vaOD: '20/25',
    vaOS: '20/20',
    overallScore: 72,
    status: 'Complete',
    conditions: ['Mild myopia OD', 'IOP borderline elevated'],
  },
  {
    id: 's2',
    date: '2026-05-22',
    type: 'Vision + Retinal',
    riskLevel: 'Low',
    vaOD: '20/20',
    vaOS: '20/20',
    overallScore: 88,
    status: 'Complete',
    conditions: ['No significant findings'],
  },
  {
    id: 's3',
    date: '2026-02-10',
    type: 'Vision Only',
    riskLevel: 'Low',
    vaOD: '20/20',
    vaOS: '20/25',
    overallScore: 85,
    status: 'Complete',
    conditions: ['Mild astigmatism OS'],
  },
  {
    id: 's4',
    date: '2025-11-03',
    type: 'Full Screening',
    riskLevel: 'Low',
    vaOD: '20/20',
    vaOS: '20/20',
    overallScore: 91,
    status: 'Complete',
    conditions: ['Normal findings'],
  },
];

export const snellenRows = [
  { letters: ['E'], size: 56, label: '20/200', acuity: 200 },
  { letters: ['F', 'P'], size: 44, label: '20/120', acuity: 120 },
  { letters: ['T', 'O', 'Z'], size: 36, label: '20/80', acuity: 80 },
  { letters: ['L', 'P', 'E', 'D'], size: 29, label: '20/60', acuity: 60 },
  { letters: ['P', 'E', 'C', 'F', 'D'], size: 24, label: '20/40', acuity: 40 },
  { letters: ['E', 'D', 'F', 'C', 'Z', 'P'], size: 19, label: '20/30', acuity: 30 },
  { letters: ['F', 'E', 'L', 'O', 'P', 'Z', 'D'], size: 15, label: '20/25', acuity: 25 },
  { letters: ['D', 'E', 'F', 'P', 'O', 'T', 'E', 'C'], size: 11, label: '20/20', acuity: 20 },
];

/* ------------------------------------------------------------------ acuity */

export type Notation = 'metric' | 'imperial';

/**
 * Snellen acuity is written 6/x in metric countries (India, UK) and 20/x in the
 * US. Both express the same ratio at different reference distances, so the
 * conversion is exact: 6/x = 20/(x/0.3).
 */
export function formatAcuity(acuity: number, notation: Notation): string {
  if (notation === 'imperial') return `20/${acuity}`;
  const metric = acuity * 0.3;
  return `6/${Number.isInteger(metric) ? metric : metric.toFixed(1)}`;
}

/**
 * WHO presenting-vision thresholds, applied to the better eye. These are the
 * cut-offs vision camps actually refer on.
 */
export function referralCategory(betterEyeAcuity: number): {
  refer: boolean;
  urgent: boolean;
  label: string;
} {
  if (betterEyeAcuity >= 200) return { refer: true, urgent: true, label: 'Severe impairment' };
  if (betterEyeAcuity > 60) return { refer: true, urgent: true, label: 'Moderate impairment' };
  if (betterEyeAcuity > 40) return { refer: true, urgent: false, label: 'Mild impairment' };
  return { refer: false, urgent: false, label: 'Within normal range' };
}
