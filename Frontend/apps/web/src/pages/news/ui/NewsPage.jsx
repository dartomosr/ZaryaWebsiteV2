import {
  LOAD_ERROR,
  NewsCard,
  useNewsFeed,
} from '../../../entities/news/index.js';
import './news-page.css';

export default function NewsPage() {
  const { items, loading, error, hasMore, loadMore } = useNewsFeed();
  let buttonText = items.length > 0 ? 'Показать ещё' : 'Загрузить новости';
  if (error) {
    buttonText = 'Повторить попытку';
  }

  return (
    <main
      id="content"
      className="news-page"
      tabIndex={-1}
    >
      <header className="news-page__masthead">
        <div className="container">
          <h1>Новости</h1>
          <p>Публикации проекта «ЗАРЯ: Марш Революции».</p>
        </div>
      </header>
      <section
        className="container news-page__feed"
        aria-label="Опубликованные новости"
      >
        {items.length > 0 && (
          <div
            className="news-grid news-page__grid"
            aria-busy={loading}
          >
            {items.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                headingLevel={2}
              />
            ))}
          </div>
        )}
        {loading && (
          <p
            className="state-message"
            role="status"
          >
            Загрузка новостей…
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="state-message">Опубликованных новостей пока нет.</p>
        )}
        {error && (
          <p
            className="state-message state-message--error"
            role="alert"
          >
            {LOAD_ERROR}
          </p>
        )}
        {hasMore && (
          <div className="news-page__actions">
            <button
              className="button zarya-button"
              disabled={loading}
              onClick={loadMore}
            >
              {buttonText}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
