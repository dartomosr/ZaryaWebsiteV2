export const LOAD_ERROR = 'Не удалось выполнить операцию. Повторите попытку позже';

/** @typedef {import('./news.contract.js').NewsSummaryDto} NewsSummaryDto */

const NEWS_FIELDS = ['id', 'title', 'summary', 'coverUrl', 'publishedAt'];

const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i;

export function apiBaseUrl() {
  const configuredBase = import.meta.env.VITE_API_BASE_URL || '/api/';
  const baseUrl = new URL(configuredBase, window.location.origin).href;

  return baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
}

/**
 * @param {{page?: number, pageSize?: number, signal?: AbortSignal}} [options]
 * @returns {Promise<NewsSummaryDto[]>}
 */
export async function getNews({ page = 1, pageSize = 12, signal } = {}) {
  const validPage = Number.isInteger(page) && page >= 1;
  const validPageSize = Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 50;

  if (!validPage || !validPageSize) {
    throw new Error(LOAD_ERROR);
  }

  const url = new URL('news', apiBaseUrl());
  url.searchParams.set('page', String(page));
  url.searchParams.set('pageSize', String(pageSize));

  try {
    const response = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
    });
    const items = await readNewsResponse(response, pageSize);

    // Относительные ссылки относятся к origin API, даже если сайт размещён отдельно.
    const apiOrigin = url.origin + '/';

    return items.map(item => ({
      ...item,
      coverUrl: new URL(item.coverUrl, apiOrigin).href,
    }));
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    throw new Error(LOAD_ERROR, { cause: error });
  }
}

/**
 * @param {Response} response
 * @param {number} pageSize
 * @returns {Promise<NewsSummaryDto[]>}
 */
async function readNewsResponse(response, pageSize) {
  if (!response.ok) {
    throw new Error(LOAD_ERROR);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const mediaType = contentType.split(';', 1)[0].trim().toLowerCase();

  if (mediaType !== 'application/json') {
    throw new Error(LOAD_ERROR);
  }

  const items = await response.json();

  if (!Array.isArray(items) || items.length > pageSize) {
    throw new Error(LOAD_ERROR);
  }

  for (const item of items) {
    if (!isNews(item)) {
      throw new Error(LOAD_ERROR);
    }
  }

  return items;
}

/**
 * @param {unknown} value
 * @returns {value is NewsSummaryDto}
 */
function isNews(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const item = /** @type {Record<string, unknown>} */ (value);

  if (Object.keys(item).some(key => !NEWS_FIELDS.includes(key))) {
    return false;
  }

  if (typeof item.id !== 'string' || item.id.length === 0) {
    return false;
  }

  if (typeof item.title !== 'string' || typeof item.summary !== 'string') {
    return false;
  }

  if (typeof item.coverUrl !== 'string' || !isImageUrl(item.coverUrl)) {
    return false;
  }

  if (typeof item.publishedAt !== 'string' || !DATE_TIME_PATTERN.test(item.publishedAt)) {
    return false;
  }

  return Number.isFinite(Date.parse(item.publishedAt));
}

/** @param {string} value */
function isImageUrl(value) {
  if (!value || /[\s\\]/.test(value)) {
    return false;
  }

  try {
    const apiOrigin = new URL(apiBaseUrl()).origin + '/';
    const url = new URL(value, apiOrigin);

    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
