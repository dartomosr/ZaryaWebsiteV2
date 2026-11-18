import { HomePage } from '../pages/home/index.js';
import { NewsPage } from '../pages/news/index.js';
import { SiteLayout } from '../shared/ui/site-layout/index.js';

export default function App() {
  return (
    <>
      {import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true' && (
        <p className="mock-notice">Тестовые данные</p>
      )}
      <SiteLayout pathname={window.location.pathname}>
        {window.location.pathname === '/news' ? <NewsPage /> : <HomePage />}
      </SiteLayout>
    </>
  );
}
