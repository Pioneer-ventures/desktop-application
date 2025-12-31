/**
 * Ultra-fast entry point with progressive loading
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { config } from './config';

// Expose API base URL immediately (before React loads)
declare global {
  interface Window {
    __API_BASE_URL__?: string;
  }
}

window.__API_BASE_URL__ = config.api.baseURL;

// Lazy load the heavy App component (progressive loading)
const App = React.lazy(() => import('./App'));

// Show loading state immediately
const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <React.Suspense 
      fallback={
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '14px',
          color: '#666',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        }}>
          Loading...
        </div>
      }
    >
      <App />
    </React.Suspense>
  </React.StrictMode>
);

