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
    const response = await fetch(url, { signal, headers: { Accept: 'multipart/mixed' } });
    if (!response.ok) throw new Error(LOAD_ERROR);
    const data = await parseNewsResponse(response);
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

/** @param {Response} response @returns {Promise<import('./news.contract.js').NewsPageDto>} */
async function parseNewsResponse(response) {
  const contentType = response.headers.get('content-type') ?? '';
  const mediaType = contentType.split(';', 1)[0].trim().toLowerCase();
  const boundaryMatch = /(?:^|;)\s*boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  if (mediaType !== 'multipart/mixed' || !boundaryMatch) throw new Error(LOAD_ERROR);

  const parts = splitMultipart(new Uint8Array(await response.arrayBuffer()), boundaryMatch[1] ?? boundaryMatch[2]);
  const metadataPart = parts.shift();
  if (metadataPart?.headers.get('content-id') !== '<metadata>'
    || (metadataPart.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    throw new Error(LOAD_ERROR);
  }
  const metadata = JSON.parse(new TextDecoder().decode(metadataPart.body));
  const images = new Map();
  for (const part of parts) {
    const partType = (part.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
    const contentId = part.headers.get('content-id');
    if (!contentId || !/^<[^<>]+>$/.test(contentId)
      || !['image/jpeg', 'image/png', 'image/webp'].includes(partType) || images.has(contentId)) {
      throw new Error(LOAD_ERROR);
    }
    images.set(contentId, new Blob([part.body], { type: partType }));
  }

  if (!metadata || !Array.isArray(metadata.items)) throw new Error(LOAD_ERROR);
  const items = metadata.items.map((/** @type {Record<string, unknown>} */ value) => {
    if (!value || typeof value !== 'object') throw new Error(LOAD_ERROR);
    const { coverPartId, ...item } = value;
    if (coverPartId === null) return { ...item, coverImage: null };
    if (typeof coverPartId !== 'string' || !images.has(coverPartId)) throw new Error(LOAD_ERROR);
    const coverImage = images.get(coverPartId);
    images.delete(coverPartId);
    return { ...item, coverImage };
  });
  if (images.size !== 0) throw new Error(LOAD_ERROR);
  return { ...metadata, items };
}

/** @param {Uint8Array} bytes @param {string} boundary */
function splitMultipart(bytes, boundary) {
  if (!boundary || /[\r\n]/.test(boundary)) throw new Error(LOAD_ERROR);
  const delimiter = new TextEncoder().encode(`--${boundary}`);
  const headerEnd = new Uint8Array([13, 10, 13, 10]);
  const crlf = new Uint8Array([13, 10]);
  const parts = [];
  let cursor = 0;

  while (true) {
    if (!matchesAt(bytes, delimiter, cursor)) throw new Error(LOAD_ERROR);
    cursor += delimiter.length;
    if (bytes[cursor] === 45 && bytes[cursor + 1] === 45) {
      cursor += 2;
      if (cursor < bytes.length && !(bytes[cursor] === 13 && bytes[cursor + 1] === 10 && cursor + 2 === bytes.length)) {
        throw new Error(LOAD_ERROR);
      }
      return parts;
    }
    if (bytes[cursor] !== 13 || bytes[cursor + 1] !== 10) throw new Error(LOAD_ERROR);
    const headersStart = cursor + 2;
    const headersEnd = findSequence(bytes, headerEnd, headersStart);
    if (headersEnd < 0) throw new Error(LOAD_ERROR);
    const headers = readPartHeaders(new TextDecoder().decode(bytes.subarray(headersStart, headersEnd)));
    const bodyStart = headersEnd + headerEnd.length;
    const nextBoundary = findSequence(bytes, new Uint8Array([...crlf, ...delimiter]), bodyStart);
    if (nextBoundary < 0) throw new Error(LOAD_ERROR);
    parts.push({ headers, body: bytes.slice(bodyStart, nextBoundary) });
    cursor = nextBoundary + crlf.length;
  }
}

/** @param {string} raw */
function readPartHeaders(raw) {
  const headers = new Map();
  for (const line of raw.split('\r\n')) {
    const separator = line.indexOf(':');
    if (separator <= 0) throw new Error(LOAD_ERROR);
    const name = line.slice(0, separator).trim().toLowerCase();
    if (headers.has(name)) throw new Error(LOAD_ERROR);
    headers.set(name, line.slice(separator + 1).trim());
  }
  return headers;
}

/** @param {Uint8Array} bytes @param {Uint8Array} sequence @param {number} start */
function findSequence(bytes, sequence, start) {
  for (let index = start; index <= bytes.length - sequence.length; index += 1) {
    if (matchesAt(bytes, sequence, index)) return index;
  }
  return -1;
}

/** @param {Uint8Array} bytes @param {Uint8Array} sequence @param {number} index */
function matchesAt(bytes, sequence, index) {
  if (index < 0 || index + sequence.length > bytes.length) return false;
  return sequence.every((value, offset) => bytes[index + offset] === value);
}

/** @param {unknown} value @returns {value is import('./news.contract.js').NewsSummaryDto} */
function isNews(value) {
  if (!value || typeof value !== 'object') return false;
  const item = /** @type {Record<string, unknown>} */ (value);
  return typeof item.id === 'string' && item.id.length > 0
    && typeof item.title === 'string' && typeof item.summary === 'string'
    && (item.coverImage === null || (item.coverImage instanceof Blob && item.coverImage.size > 0
      && ['image/jpeg', 'image/png', 'image/webp'].includes(item.coverImage.type)))
    && typeof item.publishedAt === 'string' && item.publishedAt.endsWith('Z') && Number.isFinite(Date.parse(item.publishedAt));
}
