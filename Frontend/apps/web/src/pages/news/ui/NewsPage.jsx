import { LOAD_ERROR, NewsCard, useNewsFeed } from '../../../entities/news/index.js';

export default function NewsPage() {
  const { items, loading, error, hasMore, loadMore } = useNewsFeed(12);
  let buttonText = items.length > 0 ? 'Показать ещё' : 'Загрузить новости';
  if (error) buttonText = 'Повторить попытку';

  return (
    <main id="content" className="container page-content">
      <header className="page-heading">
        <p className="eyebrow">ЗАРЯ / Журнал</p>
        <h1>Новости</h1>
        <p className="lead">Последние публикации проекта «ЗАРЯ: Марш Революции».</p>
      </header>
      <section aria-label="Опубликованные новости" aria-busy={loading}>
        <div className="news-grid">
          {items.map(item => <NewsCard key={item.id} item={item} />)}
        </div>
        {loading && <p className="state-message" role="status">Загрузка новостей…</p>}
        {!loading && !error && items.length === 0 && (
          <p className="state-message">Опубликованных новостей пока нет.</p>
        )}
        {error && <p className="state-message state-message--error" role="alert">{LOAD_ERROR}</p>}
        {hasMore && (
          <div className="load-more">
            <button className="button button--outline" disabled={loading} onClick={loadMore}>
              {buttonText}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
