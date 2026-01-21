import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { setupInterceptors } from './services/interceptors';
import { ApiError } from './services/interceptors/errors';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos

      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;

        if (error instanceof ApiError) {
          if (error.status && error.status >= 400 && error.status < 500) {
            return false;
          }

          if (error.status && error.status >= 500) {
            return true;
          }
        }

        return true;
      },
    },

    mutations: {
      retry: false, // No retry in mutations
    },
  },
});
setupInterceptors();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
