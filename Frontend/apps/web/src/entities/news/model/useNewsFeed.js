import { useCallback, useEffect, useRef, useState } from 'react';
import { getNews } from '../api/news.js';

/** @typedef {import('../api/news.contract.js').NewsSummaryDto} NewsSummaryDto */

/** @param {number} pageSize */
export function useNewsFeed(pageSize) {
  const [items, setItems] = useState(/** @type {NewsSummaryDto[]} */ ([]));
  const [nextPage, setNextPage] = useState(/** @type {number | null} */ (1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const active = useRef(/** @type {AbortController | null} */ (null));

  const load = useCallback(async (page = 1) => {
    if (active.current && !active.current.signal.aborted) return;

    const controller = new AbortController();
    active.current = controller;

    try {
      const result = await getNews({ page, pageSize, signal: controller.signal });
      if (controller.signal.aborted) return;

      setItems(previous => {
        const combined = page === 1 ? [] : [...previous];
        const seenIds = new Set(combined.map(item => item.id));
        for (const item of result) {
          if (seenIds.has(item.id)) continue;
          combined.push(item);
          seenIds.add(item.id);
        }
        return combined;
      });
      setNextPage(result.length === pageSize ? page + 1 : null);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) {
        active.current = null;
        setLoading(false);
      }
    }
  }, [pageSize]);

  useEffect(() => {
    // Загрузка обновляет состояние только после ответа API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return () => active.current?.abort();
  }, [load]);

  function loadMore() {
    if (nextPage === null || active.current && !active.current.signal.aborted) return;
    setLoading(true);
    setError(false);
    void load(nextPage);
  }

  return { items, loading, error, hasMore: nextPage !== null, loadMore };
}
