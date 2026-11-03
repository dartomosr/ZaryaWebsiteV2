// DTO списка соответствует NewsResponse в docs/api-contracts/shared/common.yaml.
/**
 * @typedef {Object} NewsSummaryDto
 * @property {string} id
 * @property {string} title
 * @property {string} summary
 * @property {string} coverUrl
 * @property {string} publishedAt
 */

/**
 * @typedef {Object} ApiErrorDto
 * @property {string} code
 * @property {string} message
 * @property {Record<string, string[]>} [errors]
 */

export {};
