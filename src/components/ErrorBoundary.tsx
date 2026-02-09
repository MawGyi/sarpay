'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI. If omitted, uses built-in fallback. */
  fallback?: ReactNode;
  /** Section label for the error message context */
  section?: string;
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary with elegant fallback UI.
 * Catches rendering errors in its subtree and shows a recovery UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.section ? ` - ${this.props.section}` : ''}]`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[200px] text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Something went wrong
          </h3>
          <p className="text-sm text-muted mb-1 max-w-md">
            {this.props.section
              ? `An error occurred in the ${this.props.section}.`
              : 'An unexpected error occurred.'}
          </p>
          {this.state.error && (
            <p className="text-xs text-red-400/60 mb-4 max-w-md font-mono">
              {this.state.error.message}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-xl text-white text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-white/10 border border-border rounded-xl text-foreground text-sm font-medium transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
