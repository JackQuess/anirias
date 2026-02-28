import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches React render errors so the whole site doesn't go blank.
 * Shows a fallback UI and logs the error.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center p-8 text-center">
          <div className="max-w-md">
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">
              Bir şey <span className="text-brand-red">ters gitti</span>
            </h1>
            <p className="text-gray-400 text-sm mb-6">
              Sayfa yüklenirken bir hata oluştu. Yenileyip tekrar deneyebilirsiniz.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-brand-red hover:bg-brand-redHover text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-colors"
            >
              Sayfayı yenile
            </button>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 text-left text-xs text-gray-500 overflow-auto max-h-40 p-4 bg-black/30 rounded-xl">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
