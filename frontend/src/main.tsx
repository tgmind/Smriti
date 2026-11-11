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
        <div style={{ padding: '24px', color: '#f8fafc', backgroundColor: '#0d121c', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ color: '#f59e0b', fontSize: '20px', fontWeight: 'bold' }}>SMRITI Startup Alert</h2>
          <p style={{ marginTop: '8px', color: '#94a3b8' }}>An unexpected error occurred while initializing the application:</p>
          <pre style={{ marginTop: '12px', padding: '12px', background: '#1a2233', borderRadius: '8px', color: '#f43f5e', overflowX: 'auto', fontSize: '13px' }}>
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '16px', padding: '10px 16px', backgroundColor: '#f59e0b', color: '#0d121c', fontWeight: 'bold', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
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
