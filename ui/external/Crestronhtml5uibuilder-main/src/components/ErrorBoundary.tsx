import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: '#18181b', color: '#f4f4f5',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '40px', fontFamily: 'ui-monospace, monospace',
        }}>
          <h1 style={{ color: '#ef4444', fontSize: '24px', marginBottom: '16px' }}>
            Runtime Error Caught
          </h1>
          <div style={{
            background: '#27272a', borderRadius: '12px', padding: '24px',
            maxWidth: '800px', width: '100%', maxHeight: '60vh', overflow: 'auto',
          }}>
            <p style={{ color: '#fbbf24', marginBottom: '12px', fontSize: '16px' }}>
              {this.state.error?.message}
            </p>
            <pre style={{ fontSize: '11px', color: '#a1a1aa', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {this.state.error?.stack}
            </pre>
            {this.state.errorInfo && (
              <pre style={{ fontSize: '11px', color: '#71717a', whiteSpace: 'pre-wrap', marginTop: '16px', borderTop: '1px solid #3f3f46', paddingTop: '16px' }}>
                Component Stack:{'\n'}{this.state.errorInfo.componentStack}
              </pre>
            )}
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
            }}
            style={{
              marginTop: '20px', padding: '10px 24px',
              background: '#3b82f6', color: 'white', border: 'none',
              borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('crestron-project');
              window.location.reload();
            }}
            style={{
              marginTop: '10px', padding: '10px 24px',
              background: '#dc2626', color: 'white', border: 'none',
              borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
            }}
          >
            Reset Project &amp; Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
