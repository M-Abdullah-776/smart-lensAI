import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import './index.css';

// Eagerly ping the backend to warm it up from Render's cold-start sleep
// This runs silently in the background so users never wait on first form submit
(async () => {
  try {
    const base = import.meta.env.VITE_API_URL?.trim() || (import.meta.env.PROD ? 'https://smart-lensai.onrender.com' : 'http://localhost:8000');
    await fetch(`${base}/api/health`, { method: 'GET', mode: 'cors', cache: 'no-store' });
  } catch (_) { /* silent — backend unavailable or still waking */ }
})();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
