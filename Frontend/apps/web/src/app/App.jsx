import HomePage from '../pages/HomePage.jsx';
import NewsPage from '../pages/NewsPage.jsx';
export default function App() {
  return <>
    {import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true' && <p className="mock-notice">Тестовые данные</p>}
    {window.location.pathname === '/news' ? <NewsPage /> : <HomePage />}
  </>;
}
