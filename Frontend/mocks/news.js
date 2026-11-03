import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';

// PNG 1x1 для отдельного mock-запроса изображения.
const testPixel = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
  0, 0, 0, 1, 0, 0, 0, 1, 8, 4, 0, 0, 0, 181, 28, 12, 2,
  0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 252, 255, 31, 0,
  3, 3, 2, 0, 239, 191, 239, 26, 0, 0, 0, 0, 73, 69, 78, 68,
  174, 66, 96, 130,
]);

/** @type {import('../apps/web/src/api/news.contract.js').NewsSummaryDto[]} */
export const news = Array.from({ length: 26 }, (_, index) => ({
  id: `mock-news-${String(index + 1).padStart(3, '0')}`,
  title: `Тестовая новость ${String(index + 1).padStart(3, '0')}`,
  summary: 'Вымышленный материал для разработки интерфейса.',
  coverUrl: `/api/images/mock-news-${index + 1}`,
  publishedAt: new Date(Date.UTC(2026, 9, 26 - index, 12)).toISOString(),
}));

/**
 * @param {string} baseUrl
 * @param {string} [scenario]
 */
export function newsHandlers(baseUrl, scenario = 'default') {
  const newsUrl = new URL('news', baseUrl).href;
  const imageUrl = new URL('images/:id', baseUrl).href;

  const newsHandler = http.get(newsUrl, async ({ request }) => {
    const query = new URL(request.url).searchParams;
    const page = Number(query.get('page') ?? 1);
    const pageSize = Number(query.get('pageSize') ?? 12);
    const validPage = Number.isInteger(page) && page >= 1;
    const validPageSize = Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 50;

    if (!validPage || !validPageSize) {
      /** @type {Record<string, string[]>} */
      const errors = {};

      if (!validPage) {
        errors.page = ['Значение должно быть целым числом от 1.'];
      }

      if (!validPageSize) {
        errors.pageSize = ['Значение должно быть целым числом от 1 до 50.'];
      }

      return HttpResponse.json({
        code: 'INVALID_QUERY',
        message: 'Некорректные параметры запроса.',
        errors,
      }, { status: 400 });
    }

    if (scenario === 'slow') {
      await delay(1500);
    }

    if (scenario === 'network-error') {
      return HttpResponse.error();
    }

    const nextPageError = scenario === 'next-page-error' && page > 1;

    if (scenario === 'error' || nextPageError) {
      return HttpResponse.json({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Сервис временно недоступен.',
      }, { status: 503 });
    }

    const source = scenario === 'empty' ? [] : news;
    const offset = (page - 1) * pageSize;
    return HttpResponse.json(source.slice(offset, offset + pageSize));
  });

  const imageHandler = http.get(imageUrl, () => new HttpResponse(testPixel, {
    headers: { 'Content-Type': 'image/png' },
  }));

  return [newsHandler, imageHandler];
}
