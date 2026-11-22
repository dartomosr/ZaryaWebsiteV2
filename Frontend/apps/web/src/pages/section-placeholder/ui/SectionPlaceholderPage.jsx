import { Link } from 'react-router';
import './section-placeholder.css';

/** @param {{ title: string, message: string }} props */
export function SectionPlaceholderPage({ title, message }) {
  return (
    <main
      id="content"
      className="section-placeholder"
      tabIndex={-1}
    >
      <div className="container">
        <div className="section-placeholder__panel">
          <h1>{title}</h1>
          <p>{message}</p>
          <Link
            className="button zarya-button"
            to="/"
          >
            На главную
          </Link>
        </div>
      </div>
    </main>
  );
}
