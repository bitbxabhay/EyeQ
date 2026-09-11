import type { RiskLevel } from '../data/mockData';
import { cx } from './ui';
import { classifyRisk } from '../lib/scoring';

/**
 * The only chromatic values in the product. Everything else is achromatic, so
 * these three read as clinical signal rather than decoration.
 */
export const riskTone: Record<RiskLevel, string> = {
  Low: 'var(--color-low)',
  Medium: 'var(--color-moderate)',
  High: 'var(--color-high)',
};

/** Score-to-tone for the 0–100 risk scale, matching the badge thresholds. */
export function scoreTone(score: number): string {
  const classification = classifyRisk(score);
  return classification.category ? riskTone[classification.category] : 'var(--color-ink-4)';
}

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md';
  className?: string;
}

export default function RiskBadge({ level, size = 'sm', className }: RiskBadgeProps) {
  const tone = riskTone[level];
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.12em]',
        size === 'sm' ? 'text-micro' : 'text-label',
        className,
      )}
      style={{ color: tone }}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: tone }}
      />
      {level} risk
    </span>
  );
}
