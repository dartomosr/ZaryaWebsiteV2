import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import App from './app/App.jsx';
import './app/styles/global.css';
const root = document.getElementById('root');
if (!root) {
  throw new Error('Не найден корневой элемент приложения');
}
if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true') {
  const { enableMocking } = await import('../../../mocks/browser.js');
  await enableMocking();
}

const queryClient = new QueryClient();

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
