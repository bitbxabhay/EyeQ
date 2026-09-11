import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

/* ---------------------------------------------------------------- surfaces */

/**
 * Panels carry weight, not uniformity. `flat` is the default reading surface,
 * `sunken` recedes for nested data, `stated` is reserved for the one panel on
 * a page that should be read first.
 */
export function Panel({
  children,
  className,
  tone = 'flat',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'flat' | 'sunken' | 'stated';
}) {
  const tones = {
    flat: 'bg-panel border border-line-soft',
    sunken: 'bg-ground border border-line-soft',
    stated: 'bg-raised border border-line',
  };
  return <div className={cx('rounded-panel', tones[tone], className)}>{children}</div>;
}

/** Mono uppercase micro-label. Names a region; never carries the content. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        'font-mono text-label uppercase tracking-[0.14em] text-ink-3',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex items-start justify-between gap-6">
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h1 className="text-title font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        {sub && <p className="mt-1.5 max-w-prose text-sm text-ink-2">{sub}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

/** Section rule with a label sitting on it — divides without adding a box. */
export function SectionRule({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <Eyebrow>{children}</Eyebrow>
      <div className="h-px flex-1 bg-line-soft" />
    </div>
  );
}

/* ---------------------------------------------------------------- controls */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-panel font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40';
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-body',
  };
  const variants = {
    primary: 'bg-ink text-ground hover:bg-white',
    secondary: 'border border-line bg-panel text-ink hover:border-ink-4 hover:bg-raised',
    ghost: 'text-ink-2 hover:bg-panel hover:text-ink',
  };
  return (
    <button className={cx(base, sizes[size], variants[variant], className)} {...rest}>
      {children}
    </button>
  );
}

export function Field({
  label,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-label uppercase tracking-[0.14em] text-ink-3">
        {label}
      </span>
      <input
        className={cx(
          'w-full rounded-panel border border-line bg-ground px-3 py-2.5 text-body text-ink',
          'transition-colors duration-150 outline-none hover:border-ink-4 focus:border-ink-3',
          className,
        )}
        {...rest}
      />
    </label>
  );
}

export function SelectField({
  label,
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-label uppercase tracking-[0.14em] text-ink-3">
        {label}
      </span>
      <select
        className={cx(
          'w-full appearance-none rounded-panel border border-line bg-ground px-3 py-2.5 text-body text-ink',
          'transition-colors duration-150 outline-none hover:border-ink-4 focus:border-ink-3',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    </label>
  );
}

/* -------------------------------------------------------------------- data */

/**
 * A measured value. The number leads at display size; the unit and caption
 * recede. Used anywhere a reading is the point of the card.
 */
export function Readout({
  value,
  caption,
  sub,
  tone,
  size = 'md',
}: {
  value: ReactNode;
  caption: string;
  sub?: string;
  tone?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = { sm: 'text-head', md: 'text-title', lg: 'text-hero' };
  return (
    <div>
      <div className="mb-2 font-mono text-label uppercase tracking-[0.14em] text-ink-3">
        {caption}
      </div>
      <div
        className={cx('tnum font-mono font-medium tracking-[-0.01em]', sizes[size])}
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-label text-ink-4">{sub}</div>}
    </div>
  );
}

/** Horizontal magnitude bar. Always paired with its own numeral. */
export function Meter({
  value,
  tone = 'var(--color-ink-3)',
  className,
}: {
  value: number;
  tone?: string;
  className?: string;
}) {
  return (
    <div className={cx('h-px w-full bg-line', className)}>
      <div
        className="h-px transition-[width] duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: tone }}
      />
    </div>
  );
}

/** Definition row — label left, value right, hairline between. */
export function Row({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'flex items-baseline justify-between gap-4 border-b border-line-soft py-2.5 last:border-0',
        className,
      )}
    >
      <span className="text-sm text-ink-3">{label}</span>
      <span className="text-right text-sm text-ink">{children}</span>
    </div>
  );
}

/** Quiet non-semantic tag. Never coloured — colour is reserved for risk. */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-line-soft bg-ground px-2 py-0.5 font-mono text-micro uppercase tracking-widest text-ink-3">
      {children}
    </span>
  );
}

/**
 * Advisory note. `caution` and `limit` are the only two states — a screening
 * tool should be plain about what it cannot tell you.
 */
export function Note({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'caution' | 'limit';
  children: ReactNode;
}) {
  const tones = {
    neutral: 'border-line-soft text-ink-3',
    caution: 'border-l-moderate text-ink-2',
    limit: 'border-l-high text-ink-2',
  };
  const isAccent = tone !== 'neutral';
  return (
    <p
      className={cx(
        'text-sm leading-relaxed',
        isAccent ? 'border-l-2 py-0.5 pl-3' : 'rounded-panel border p-3',
        tones[tone],
      )}
    >
      {children}
    </p>
  );
}
