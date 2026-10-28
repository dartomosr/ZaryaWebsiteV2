export const LOAD_ERROR = 'Не удалось выполнить операцию. Повторите попытку позже';

/** Предварительный API base включает /api; секретов здесь быть не должно. */
export function apiBaseUrl() {
  return new URL(import.meta.env.VITE_API_BASE_URL || '/api/', window.location.origin).href.replace(/\/?$/, '/');
}

/**
 * @param {{page?: number, pageSize?: number, signal?: AbortSignal}} [options]
 * @returns {Promise<import('./news.contract.js').NewsPageDto>}
 */
export async function getNews({ page = 1, pageSize = 12, signal } = {}) {
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new Error(LOAD_ERROR);
  }
  const url = new URL('news', apiBaseUrl());
  url.search = new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString();
  try {
    const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(LOAD_ERROR);
    const data = await response.json();
    if (!data || data.page !== page || data.pageSize !== pageSize || !Array.isArray(data.items)
      || data.items.length > pageSize || !(data.nextPage === null || data.nextPage === page + 1)
      || (data.items.length === 0 && data.nextPage !== null)
      || !data.items.every(isNews) || new Set(data.items.map((/** @type {import('./news.contract.js').NewsSummaryDto} */ item) => item.id)).size !== data.items.length) {
      throw new Error(LOAD_ERROR);
    }
    return data;
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(LOAD_ERROR, { cause: error });
  }
}

/** @param {unknown} value @returns {value is import('./news.contract.js').NewsSummaryDto} */
function isNews(value) {
  if (!value || typeof value !== 'object') return false;
  const item = /** @type {Record<string, unknown>} */ (value);
  return typeof item.id === 'string' && item.id.length > 0
    && typeof item.title === 'string' && typeof item.summary === 'string'
    && (item.coverUrl === null || (typeof item.coverUrl === 'string' && safeImageUrl(item.coverUrl)))
    && typeof item.publishedAt === 'string' && item.publishedAt.endsWith('Z') && Number.isFinite(Date.parse(item.publishedAt));
}

/** @param {string} value */
function safeImageUrl(value) {
  try { return ['http:', 'https:'].includes(new URL(value, window.location.origin).protocol); }
  catch { return false; }
}
