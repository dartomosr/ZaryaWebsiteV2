import { useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import logo from '../../assets/brand/zarya-black.png';
import { placeholderSections } from '../../config/index.js';
import './site-layout.css';

const navigation = [
  { path: '/', title: 'Главная' },
  { path: '/news', title: 'Новости' },
  ...placeholderSections,
];

/** @param {{ children: import('react').ReactNode }} props */
export function SiteLayout({ children }) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPathname, setMenuPathname] = useState(pathname);
  const menuToggle = useRef(/** @type {HTMLButtonElement | null} */ (null));

  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setMenuOpen(false);
  }

  return (
    <>
      <a
        className="skip-link"
        href="#content"
      >
        Перейти к содержимому
      </a>
      <header
        className="site-header"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && menuOpen) {
            setMenuOpen(false);
            menuToggle.current?.focus();
          }
        }}
      >
        <div className="site-header__inner">
          <Link
            className="brand"
            to="/"
            onClick={() => setMenuOpen(false)}
            aria-label="ЗАРЯ: Марш Революции, главная"
          >
            <img
              src={logo}
              width="2379"
              height="2347"
              alt=""
            />
          </Link>
          <button
            ref={menuToggle}
            className="button button--outline menu-toggle"
            type="button"
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
            {navigation.map(({ path, title }) => (
              <NavLink
                key={path}
                className="navigation__link"
                to={path}
                end
                onClick={() => setMenuOpen(false)}
              >
                {title}
              </NavLink>
            ))}
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
