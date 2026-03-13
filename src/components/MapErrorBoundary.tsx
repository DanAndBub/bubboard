'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class MapErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('MapErrorBoundary caught error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6 space-y-3">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4v2m0 0v2M7.08 6.47a7 7 0 1110.84 10.06M9 9h.01M15 15h.01"
                />
              </svg>
              <h3 className="text-sm font-semibold text-red-300">Error parsing your workspace</h3>
            </div>
            <p className="text-xs text-red-200">
              {this.state.error?.message || 'An unexpected error occurred while processing your tree structure.'}
            </p>
            <p className="text-xs text-red-200/70">
              Try pasting a simpler tree structure or check that the format is correct (e.g., consistent indentation).
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-3 px-3 py-1.5 text-xs bg-red-700/30 hover:bg-red-700/50 border border-red-700/50 rounded transition-colors text-red-300"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
