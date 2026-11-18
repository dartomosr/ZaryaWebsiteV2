import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <main
      id="content"
      className="container page-content"
      tabIndex={-1}
    >
      <div className="page-heading">
        <h1>Страница не найдена</h1>
      </div>
      <Link
        className="button"
        to="/"
      >
        На главную
      </Link>
    </main>
  );
}
