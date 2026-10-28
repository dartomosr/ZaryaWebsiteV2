import { useEffect, useRef, useState } from 'react';
import { getNews, LOAD_ERROR } from '../api/news.js';

export default function NewsPage() {
  const [items, setItems] = useState(/** @type {import('../api/news.contract.js').NewsSummaryDto[]} */ ([]));
  const [nextPage, setNextPage] = useState(/** @type {number|null} */ (1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const active = useRef(/** @type {AbortController|null} */ (null));

  async function load(page = 1) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    try {
      const result = await getNews({ page, signal: controller.signal });
      if (controller.signal.aborted) return;
      setItems(previous => page === 1 ? result.items : [...previous, ...result.items.filter(item => !previous.some(existing => existing.id === item.id))]);
      setNextPage(result.nextPage);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    // Состояние меняется только после await HTTP-запроса, синхронных setState в load нет.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return () => active.current?.abort();
  }, []);

  return <main>
    <a href="/">На главную</a>
    <h1>Новости</h1>
    <section aria-label="Опубликованные новости" aria-busy={loading}>
      <div className="news-grid">{items.map(item => <article key={item.id} className="news-card">
        {item.coverUrl && <img src={item.coverUrl} alt="" loading="lazy" />}
        <h2>{item.title}</h2><p>{item.summary}</p>
        <time dateTime={item.publishedAt}>{new Date(item.publishedAt).toLocaleDateString('ru-RU', { timeZone: 'UTC' })}</time>
      </article>)}</div>
      {loading && <p role="status">Загрузка новостей…</p>}
      {!loading && !error && items.length === 0 && <p>Опубликованных новостей пока нет.</p>}
      {error && <p role="alert">{LOAD_ERROR}</p>}
      {nextPage !== null && <button disabled={loading} onClick={() => {
        setLoading(true); setError(false); void load(nextPage);
      }}>
        {error ? 'Повторить попытку' : items.length ? 'Показать ещё' : 'Загрузить новости'}
      </button>}
    </section>
  </main>;
}
