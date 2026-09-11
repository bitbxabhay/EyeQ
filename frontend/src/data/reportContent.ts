/**
 * Report copy shared by the on-screen report, the landing-page sample and the
 * PDF. Kept out of the PDF module so importing this text does not drag the
 * whole renderer into the main bundle.
 */

export const FACTORS: { label: string; effect: 'Raises' | 'Lowers' }[] = [
  { label: 'Acuity asymmetry, right eye 20/25', effect: 'Raises' },
  { label: 'Family history of glaucoma', effect: 'Raises' },
  { label: 'Borderline intraocular pressure estimate', effect: 'Raises' },
  { label: 'No diabetic history', effect: 'Lowers' },
  { label: 'No retinal abnormalities on examination', effect: 'Lowers' },
];

export const NOT_MEASURED: [string, string][] = [
  ['Intraocular pressure', 'Estimated only. Requires tonometry at a clinic.'],
  ['Retinal photography', 'Not performed. No fundus image was supplied.'],
  ['Visual field', 'Not tested. Requires perimetry.'],
  ['Refraction', 'Estimated from screen acuity. Not a prescription.'],
];

export const ASSESSMENT_SUMMARY =
  'Mild acuity asymmetry with the right eye one line behind the left, in a patient with a family history of glaucoma and a borderline pressure estimate. No retinal imaging was available. A comprehensive examination is recommended within three to six months, with intraocular pressure measurement and optic nerve assessment as the priorities.';

export const RECOMMENDATION = 'Comprehensive eye examination within three to six months';

export const RECOMMENDATION_DETAIL =
  'Request intraocular pressure measurement and optic nerve head assessment, given the family history. Confirm the right-eye refractive finding with a clinical refraction.';
