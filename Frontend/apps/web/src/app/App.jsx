import { useEffect, useRef } from 'react';
import { Route, Routes, useLocation, useNavigationType } from 'react-router';
import { HomePage } from '../pages/home/index.js';
import { NewsPage } from '../pages/news/index.js';
import { NotFoundPage } from '../pages/not-found/index.js';
import { SectionPlaceholderPage } from '../pages/section-placeholder/index.js';
import { placeholderSections } from '../shared/config/index.js';
import { SiteLayout } from '../shared/ui/site-layout/index.js';

export default function App() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }
    previousPathname.current = pathname;

    document.getElementById('content')?.focus({ preventScroll: true });
    if (navigationType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [navigationType, pathname]);

  return (
    <>
      {import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true' && (
        <p className="mock-notice">Тестовые данные</p>
      )}
      <SiteLayout>
        <Routes>
          <Route
            path="/"
            element={<HomePage />}
          />
          <Route
            path="/news"
            element={<NewsPage />}
          />
          {placeholderSections.map(({ path, title, message }) => (
            <Route
              key={path}
              path={path}
              element={
                <SectionPlaceholderPage
                  title={title}
                  message={message}
                />
              }
            />
          ))}
          <Route
            path="*"
            element={<NotFoundPage />}
          />
        </Routes>
      </SiteLayout>
    </>
  );
}
