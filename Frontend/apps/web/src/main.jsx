import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.jsx';
import './styles/global.css';
const root = document.getElementById('root');
if (!root) throw new Error('Не найден корневой элемент приложения');
if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true') {
  const { enableMocking } = await import('../../../mocks/browser.js');
  await enableMocking();
}
createRoot(root).render(<StrictMode><App /></StrictMode>);
