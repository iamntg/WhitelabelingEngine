import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { ToastProvider } from './lib/toast.jsx';
import './styles/chrome.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The draft is owned by the Zustand store once hydrated; refetching it
      // behind the editor would clobber unsaved work.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root');

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
