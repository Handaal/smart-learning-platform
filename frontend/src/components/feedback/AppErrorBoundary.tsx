import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import styles from './AppErrorBoundary.module.css';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string | null;
};

export default class AppErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'Unexpected interface error',
    };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI route crash captured by AppErrorBoundary', error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <section className={styles.shell}>
        <div className={styles.panel}>
          <div className={styles.iconWrap}>
            <AlertTriangle size={22} />
          </div>
          <div className={styles.copy}>
            <h2>This page hit a rendering error.</h2>
            <p>
              The route did not load correctly, but the application is still running. Refresh the page to
              retry with a clean state.
            </p>
            {this.state.message ? (
              <code className={styles.message}>{this.state.message}</code>
            ) : null}
          </div>
          <button type="button" className="btn btn-primary" onClick={this.handleReload}>
            <RotateCcw size={15} />
            Reload page
          </button>
        </div>
      </section>
    );
  }
}
