import { cx } from './ui';

/**
 * The mark is a Snellen optotype E, constructed the way real optotypes are —
 * on a 5×5 grid with stroke and gap both one unit. It is the one symbol every
 * person on earth associates with having their eyes tested, and it is also the
 * chart this product actually uses, so the logo names the method rather than
 * decorating it.
 *
 * `rotation` tilts the E through the four Tumbling E orientations.
 */
export function OptotypeE({
  className,
  rotation = 0,
  boxed = true,
  size,
}: {
  className?: string;
  rotation?: 0 | 90 | 180 | 270;
  boxed?: boolean;
  /** Explicit pixel size, for chart rendering where the optotype must be exact. */
  size?: number;
}) {
  const bars = (
    <g fill="currentColor">
      <rect x="6" y="6" width="4" height="20" />
      <rect x="10" y="6" width="16" height="4" />
      <rect x="10" y="14" width="16" height="4" />
      <rect x="10" y="22" width="16" height="4" />
    </g>
  );

  return (
    <svg
      viewBox="0 0 32 32"
      className={cx('shrink-0', className)}
      aria-hidden
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0.35s cubic-bezier(0.2,0,0.1,1), width 0.3s ease, height 0.3s ease',
        ...(size ? { width: size, height: size } : null),
      }}
    >
      {boxed ? (
        <>
          <rect width="32" height="32" rx="7" className="fill-ink" />
          <g className="text-ground">{bars}</g>
        </>
      ) : (
        bars
      )}
    </svg>
  );
}

export function Wordmark({
  compact = false,
  rotation = 0,
}: {
  compact?: boolean;
  rotation?: 0 | 90 | 180 | 270;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <OptotypeE className="h-6 w-6" rotation={rotation} />
      {!compact && (
        <span className="text-body font-semibold tracking-[-0.015em] text-ink">EyeQ</span>
      )}
    </div>
  );
}
