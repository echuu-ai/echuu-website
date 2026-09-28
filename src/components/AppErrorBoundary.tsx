import { Component, type ErrorInfo, type ReactNode } from 'react';
import { analytics } from '../lib/analytics/client';
import { getSiteText } from '../i18n/site';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Root-level boundary. A render crash anywhere in the SPA lands here instead of
 * a blank page: the user gets a localized explanation, the error text, and a
 * reload button. The error is also reported through analytics as fatal.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const where = String(info.componentStack ?? '').trim().split('\n')[0]?.trim() ?? '';
    analytics.track('error_occurred', {
      scope: 'react',
      message: `${String(error?.message ?? error)}${where ? ` @ ${where}` : ''}`.slice(0, 200),
      fatal: true,
    });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <section className="app-error-screen" role="alert">
        <div className="app-error-card">
          <h1>{getSiteText('app_error_title')}</h1>
          <p>{getSiteText('app_error_body')}</p>
          <pre>{`${error.name}: ${error.message}`}</pre>
          <button type="button" onClick={() => window.location.reload()}>
            {getSiteText('app_error_reload')}
          </button>
        </div>
      </section>
    );
  }
}
