import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in SMRITI:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', color: '#0f172a', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ color: '#d97706', fontSize: '18px', fontWeight: 'bold' }}>SMRITI Startup Notice</h2>
          <p style={{ marginTop: '8px', color: '#64748b', fontSize: '14px' }}>An error occurred while initializing the view:</p>
          <pre style={{ marginTop: '12px', padding: '12px', background: '#f1f5f9', borderRadius: '8px', color: '#e11d48', overflowX: 'auto', fontSize: '12px' }}>
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '16px', padding: '10px 18px', backgroundColor: '#0f172a', color: '#ffffff', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
