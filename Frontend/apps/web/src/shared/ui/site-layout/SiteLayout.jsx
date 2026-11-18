import { useState } from 'react';

/** @param {{ children: import('react').ReactNode, pathname: string }} props */
export function SiteLayout({ children, pathname }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <a
        className="skip-link"
        href="#content"
      >
        Перейти к содержимому
      </a>
      <header className="site-header">
        <div className="container site-header__inner">
          <a
            className="brand"
            href="/"
            aria-label="ЗАРЯ: Марш Революции, главная"
          >
            <span
              className="brand__symbol"
              aria-hidden="true"
            >
              З
            </span>
            <span>
              ЗАРЯ<small>Марш Революции</small>
            </span>
          </a>
          <button
            className="menu-toggle button button--outline"
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? 'Закрыть меню' : 'Меню'}
          </button>
          <nav
            id="main-navigation"
            className={menuOpen ? 'navigation navigation--open' : 'navigation'}
            aria-label="Основная навигация"
          >
            <a
              href="/"
              aria-current={pathname === '/' ? 'page' : undefined}
            >
              Главная
            </a>
            <a
              href="/news"
              aria-current={pathname === '/news' ? 'page' : undefined}
            >
              Новости
            </a>
          </nav>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="container site-footer__inner">
          <span>ЗАРЯ: Марш Революции</span>
          <span>Официальный сайт игры</span>
        </div>
      </footer>
    </>
  );
}
