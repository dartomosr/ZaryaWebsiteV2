import { useEffect, useRef, useState } from 'react';
import { getNews, LOAD_ERROR } from '../api/news.js';

/** @typedef {import('../api/news.contract.js').NewsSummaryDto} NewsSummaryDto */

const PAGE_SIZE = 12;

export default function NewsPage() {
  const [items, setItems] = useState(/** @type {NewsSummaryDto[]} */ ([]));
  const [nextPage, setNextPage] = useState(/** @type {number|null} */ (1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const active = useRef(/** @type {AbortController|null} */ (null));

  async function load(page = 1) {
    if (active.current && !active.current.signal.aborted) {
      return;
    }

    const controller = new AbortController();
    active.current = controller;

    try {
      const result = await getNews({
        page,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      setItems(previous => {
        const combined = page === 1 ? [] : [...previous];
        const seenIds = new Set(combined.map(item => item.id));

        for (const item of result) {
          if (seenIds.has(item.id)) {
            continue;
          }

          combined.push(item);
          seenIds.add(item.id);
        }

        return combined;
      });

      setNextPage(result.length === PAGE_SIZE ? page + 1 : null);
    } catch {
      if (!controller.signal.aborted) {
        setError(true);
      }
    } finally {
      if (!controller.signal.aborted) {
        active.current = null;
        setLoading(false);
      }
    }
  }

  function loadNextPage() {
    if (nextPage === null) {
      return;
    }

    setLoading(true);
    setError(false);
    void load(nextPage);
  }

  useEffect(() => {
    // load обновляет состояние после await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();

    return () => active.current?.abort();
  }, []);

  let buttonText = items.length > 0 ? 'Показать ещё' : 'Загрузить новости';

  if (error) {
    buttonText = 'Повторить попытку';
  }

  return (
    <main>
      <a href="/">На главную</a>
      <h1>Новости</h1>

      <section aria-label="Опубликованные новости" aria-busy={loading}>
        <div className="news-grid">
          {items.map(item => (
            <article key={item.id} className="news-card">
              <img
                src={item.coverUrl}
                alt=""
                loading="lazy"
                onError={event => {
                  event.currentTarget.hidden = true;
                }}
              />
              <h2>{item.title}</h2>
              <p>{item.summary}</p>
              <time dateTime={item.publishedAt}>
                {new Date(item.publishedAt).toLocaleDateString('ru-RU', { timeZone: 'UTC' })}
              </time>
            </article>
          ))}
        </div>

        {loading && <p role="status">Загрузка новостей…</p>}
        {!loading && !error && items.length === 0 && (
          <p>Опубликованных новостей пока нет.</p>
        )}
        {error && <p role="alert">{LOAD_ERROR}</p>}
        {nextPage !== null && (
          <button disabled={loading} onClick={loadNextPage}>
            {buttonText}
          </button>
        )}
      </section>
    </main>
  );
}
