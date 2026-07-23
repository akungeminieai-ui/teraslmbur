'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { AppButton } from '@teras-lmbur/ui';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-2xl border border-danger-500/20 bg-[var(--card)] p-8 text-center shadow-xl backdrop-blur-md animate-fade-in my-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-500/10 text-danger-500 border border-danger-500/20 mb-4 animate-pulse">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide">Something went wrong</h2>
          <p className="mt-2 text-xs text-[var(--muted-foreground)] max-w-md">
            An unexpected error occurred in this view. Teras Lmbur OS has isolated this failure to protect your session.
          </p>
          {this.state.error && (
            <pre className="mt-4 rounded-lg bg-[var(--background)] border border-[var(--border)] p-3 text-[10px] font-mono text-danger-400 max-w-lg overflow-x-auto text-left w-full">
              {this.state.error.name}: {this.state.error.message}
            </pre>
          )}
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <AppButton
              size="sm"
              variant="outline"
              onClick={this.handleGoHome}
              leftIcon={<Home className="h-3.5 w-3.5" />}
            >
              Go to Home
            </AppButton>
            <AppButton
              size="sm"
              onClick={this.handleRetry}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Reload View
            </AppButton>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
