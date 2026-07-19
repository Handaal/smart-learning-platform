import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useI18n } from '@/i18n';
import styles from './AppErrorBoundary.module.css';

type Props = {
  children: ReactNode;
};

type Copy = {
  fallbackMessage: string;
  title: string;
  description: string;
  reload: string;
};

type State = {
  hasError: boolean;
  message: string | null;
};

class AppErrorBoundaryInner extends Component<Props & { copy: Copy }, State> {
  public state: State = {
    hasError: false,
    message: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || null,
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
            <h2>{this.props.copy.title}</h2>
            <p>{this.props.copy.description}</p>
            {this.state.message ? (
              <code className={styles.message}>{this.state.message}</code>
            ) : (
              <code className={styles.message}>{this.props.copy.fallbackMessage}</code>
            )}
          </div>
          <button type="button" className="btn btn-primary" onClick={this.handleReload}>
            <RotateCcw size={15} />
            {this.props.copy.reload}
          </button>
        </div>
      </section>
    );
  }
}

export default function AppErrorBoundary({ children }: Props) {
  const { language } = useI18n();
  const copy =
    language === 'ar'
      ? {
          fallbackMessage: 'حدث خطأ غير متوقع في الواجهة',
          title: 'حدث خطأ أثناء عرض هذه الصفحة.',
          description:
            'لم يتم تحميل المسار بشكل صحيح، لكن التطبيق ما زال يعمل. حدّث الصفحة للمحاولة مرة أخرى بحالة نظيفة.',
          reload: 'إعادة تحميل الصفحة',
        }
      : {
          fallbackMessage: 'Unexpected interface error',
          title: 'This page hit a rendering error.',
          description:
            'The route did not load correctly, but the application is still running. Refresh the page to retry with a clean state.',
          reload: 'Reload page',
        };

  return <AppErrorBoundaryInner copy={copy}>{children}</AppErrorBoundaryInner>;
}
