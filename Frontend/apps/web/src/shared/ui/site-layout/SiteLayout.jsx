import { useState } from 'react';
import { Link, NavLink } from 'react-router';

/** @param {{ children: import('react').ReactNode }} props */
export function SiteLayout({ children }) {
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
          <Link
            className="brand"
            to="/"
            onClick={() => setMenuOpen(false)}
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
          </Link>
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
            <NavLink
              to="/"
              end
              onClick={() => setMenuOpen(false)}
            >
              Главная
            </NavLink>
            <NavLink
              to="/news"
              end
              onClick={() => setMenuOpen(false)}
            >
              Новости
            </NavLink>
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
