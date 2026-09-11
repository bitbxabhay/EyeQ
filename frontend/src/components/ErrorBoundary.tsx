import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './ui';

interface Props {
  children: ReactNode;
  /** Called when the user chooses to start over, e.g. to reset app navigation. */
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors so a single bad component does not blank the screen.
 * Errors are stated in plain terms with a way out — a screening tool that dies
 * silently is worse than one that admits it broke.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex h-full items-center justify-center overflow-y-auto bg-ground px-8 py-10">
        <div className="w-full max-w-md">
          <div className="mb-5 h-px w-10 bg-high" />
          <h1 className="text-title font-semibold tracking-[-0.02em] text-ink">
            This screen stopped working
          </h1>
          <p className="mt-2.5 text-body leading-relaxed text-ink-2">
            Something in the page failed to render. Your screening data is unaffected — nothing was saved or
            sent anywhere.
          </p>

          <details className="mt-6 border-y border-line-soft py-3">
            <summary className="cursor-pointer font-mono text-label tracking-widest text-ink-3 uppercase">
              Technical detail
            </summary>
            <pre className="mt-3 overflow-x-auto font-mono text-micro leading-relaxed whitespace-pre-wrap text-ink-4">
              {error.message}
            </pre>
          </details>

          <div className="mt-7 flex flex-wrap gap-2">
            <Button variant="primary" onClick={this.handleReset}>
              Back to summary
            </Button>
            <Button variant="ghost" onClick={() => window.location.reload()}>
              Reload the app
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

/** Shown when navigation lands on a page that does not exist. */
export function NotFound({ onHome }: { onHome: () => void }) {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto px-8 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 font-mono text-hero font-medium tracking-[-0.02em] text-ink-4">404</div>
        <h1 className="text-title font-semibold tracking-[-0.02em] text-ink">No such page</h1>
        <p className="mt-2.5 text-body leading-relaxed text-ink-2">
          That screen is not part of the screening flow. It may have been renamed, or the link may be stale.
        </p>
        <div className="mt-7">
          <Button variant="primary" onClick={onHome}>
            Back to summary
          </Button>
        </div>
      </div>
    </div>
  );
}
