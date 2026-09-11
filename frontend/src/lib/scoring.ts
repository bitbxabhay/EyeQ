import { formatAcuity, referralCategory, type Notation, type RiskLevel } from '../data/mockData';
import type { Factor, PredictResult, ScreeningIn } from './api';

export interface VisionOutcome {
  od: number; // Snellen denominator, e.g. 20 for 20/20
  os: number;
  notation: Notation;
  chartMode: 'distance' | 'near' | 'amsler' | 'peripheral' | 'color';
  colorVision?: { correct: number; total: number; unanswered: number; result: string };
}

export interface RiskClassification {
  category: RiskLevel | null;
  label: string;
  description: string;
  gaugePosition: number | null;
}

/**
 * The composite score is a health score: higher is better. Keep all display
 * surfaces on these same exclusive boundaries.
 */
export function classifyRisk(score: number | null | undefined): RiskClassification {
  if (score == null || !Number.isFinite(score)) {
    return { category: null, label: 'Risk unavailable', description: 'A valid screening score is required to classify risk.', gaugePosition: null };
  }

  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  if (safeScore < 40) {
    return { category: 'High', label: 'High risk', description: 'The screening score falls in the high-risk band. A comprehensive eye examination is recommended.', gaugePosition: safeScore };
  }
  if (safeScore < 70) {
    return { category: 'Medium', label: 'Medium risk', description: 'The screening score falls in the moderate-risk band. Follow-up with an eye-care professional is recommended.', gaugePosition: safeScore };
  }
  return { category: 'Low', label: 'Low risk', description: 'The screening score falls in the low-risk band. Continue routine screening; this is not an all-clear.', gaugePosition: safeScore };
}

/**
 * Rule-based composite score, built only from what was actually measured.
 * Transparent by construction: every point added or removed is a row in the
 * returned `factors` list, so the UI can show its full working (this is the
 * "explainable" half of the assessment — the model explains the retinal
 * finding via Grad-CAM, this explains the combined score via factor weights).
 */
export function computeAssessment(vision: VisionOutcome | null, retinal: PredictResult | null): ScreeningIn {
  let score = 90;
  const factors: Factor[] = [];
  const conditions: string[] = [];

  if (vision) {
    const better = Math.min(vision.od, vision.os);
    const cat = referralCategory(better);
    if (cat.refer) {
      const penalty = cat.urgent ? 30 : 16;
      score -= penalty;
      factors.push({ label: `Presenting vision: ${cat.label}`, weight: penalty, category: 'Acuity' });
      conditions.push(cat.label);
    } else {
      score -= 6;
      factors.push({ label: 'Acuity within normal presenting range', weight: -10, category: 'Acuity' });
    }

    const asymmetry = Math.abs(vision.od - vision.os);
    if (asymmetry >= 20) {
      score -= 8;
      factors.push({ label: 'Marked acuity asymmetry between eyes', weight: 8, category: 'Acuity' });
    } else if (asymmetry >= 10) {
      score -= 4;
      factors.push({ label: 'Mild acuity asymmetry between eyes', weight: 4, category: 'Acuity' });
    }

    if (vision.colorVision) {
      const { correct, total } = vision.colorVision;
      const normal = correct === total;
      factors.push({
        label: `Color vision: ${correct}/${total} plates correct`,
        weight: 0,
        category: 'Color vision',
      });
      if (!normal) conditions.push('Possible color-vision deficiency');
    }
  } else {
    factors.push({ label: 'Vision test not completed', weight: 0, category: 'Acuity' });
  }

  if (retinal) {
    if (retinal.grade === 0) {
      score += 4;
      factors.push({ label: 'No diabetic retinopathy detected', weight: -14, category: 'Retinal' });
    } else {
      const penalty = 12 + retinal.grade * 9;
      score -= penalty;
      factors.push({
        label: `${retinal.label} diabetic retinopathy detected`,
        weight: penalty,
        category: 'Retinal',
      });
      conditions.push(`${retinal.label} diabetic retinopathy (grade ${retinal.grade})`);
    }
    if (retinal.refer) {
      score -= 10;
      factors.push({ label: 'Model flags this image for referral', weight: 10, category: 'Retinal' });
    }
  } else {
    factors.push({ label: 'No fundus image was provided', weight: 0, category: 'Retinal' });
  }

  score = Math.max(5, Math.min(98, Math.round(score)));
  const riskLevel = classifyRisk(score).category ?? 'High';

  if (conditions.length === 0) conditions.push('No significant findings');

  const hasVision = !!vision;
  const hasRetinal = !!retinal;
  const type =
    hasVision && hasRetinal ? 'Full Screening' : hasVision ? 'Vision Only' : hasRetinal ? 'Retinal Only' : 'Incomplete';

  const summaryParts: string[] = [];
  if (vision) {
    const cat = referralCategory(Math.min(vision.od, vision.os));
    summaryParts.push(
      cat.refer
        ? `Presenting vision falls in the ${cat.label.toLowerCase()} band.`
        : 'Presenting vision is within the normal range.',
    );
    if (vision.colorVision) {
      summaryParts.push(
        vision.colorVision.correct === vision.colorVision.total
          ? `Color vision screening was normal (${vision.colorVision.correct}/${vision.colorVision.total} plates correct).`
          : `Color vision screening suggests a possible deficiency (${vision.colorVision.correct}/${vision.colorVision.total} plates correct).`,
      );
    }
  }
  if (retinal) {
    summaryParts.push(
      retinal.grade === 0
        ? 'No signs of diabetic retinopathy were detected on retinal imaging.'
        : `Retinal imaging shows signs consistent with ${retinal.label.toLowerCase()} diabetic retinopathy (model severity score ${retinal.severity}).`,
    );
  }
  if (summaryParts.length === 0) {
    summaryParts.push('No measurements were completed in this session.');
  }
  const summary = summaryParts.join(' ');

  const recommendation =
    riskLevel === 'High'
      ? 'Refer promptly for a comprehensive eye examination.'
      : riskLevel === 'Medium'
        ? 'Book a comprehensive eye examination within three to six months.'
        : 'No urgent action needed. Continue routine screening.';

  return {
    type,
    status: hasVision && hasRetinal ? 'Complete' : 'Partial',
    va_od: vision ? formatAcuity(vision.od, vision.notation) : null,
    va_os: vision ? formatAcuity(vision.os, vision.notation) : null,
    retinal_grade: retinal ? retinal.grade : null,
    retinal_label: retinal ? retinal.label : null,
    retinal_refer: retinal ? retinal.refer : null,
    overall_score: score,
    risk_level: riskLevel,
    conditions,
    factors,
    summary,
    recommendation,
  };
}
