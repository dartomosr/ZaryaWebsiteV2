// Предварительный контракт frontend/MSW. Требует согласования с backend.
/**
 * @typedef {Object} NewsSummaryDto
 * @property {string} id Непрозрачный идентификатор, не тип ключа БД.
 * @property {string} title
 * @property {string} summary
 * @property {string|null} coverUrl
 * @property {string} publishedAt ISO 8601, UTC.
 */
/**
 * @typedef {Object} NewsPageDto
 * @property {NewsSummaryDto[]} items
 * @property {number} page
 * @property {number} pageSize
 * @property {number|null} nextPage
 */
/**
 * @typedef {Object} ApiErrorDto
 * @property {string} code
 * @property {string} message
 * @property {Record<string, string[]>} [errors]
 */
export {};
