import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';

const testPixel = new Blob([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/7xoAAAAASUVORK5CYII='), value => value.charCodeAt(0))], { type: 'image/png' });

/** Только вымышленные данные, не описание игры и не утверждённый лор.
 * @type {{id: string, title: string, summary: string, coverImage: Blob|null, publishedAt: string}[]}
 */
export const news = Array.from({ length: 26 }, (_, index) => ({
  id: `mock-news-${String(index + 1).padStart(3, '0')}`,
  title: `Тестовая новость ${String(index + 1).padStart(3, '0')}`,
  summary: 'Вымышленный материал для разработки интерфейса.',
  coverImage: index % 3 === 0 ? testPixel : null,
  publishedAt: new Date(Date.UTC(2026, 9, 26 - index, 12)).toISOString(),
}));

/** @param {string} baseUrl @param {string} [scenario] */
export function newsHandlers(baseUrl, scenario = 'default') {
  return [http.get(new URL('news', baseUrl).href, async ({ request }) => {
    const query = new URL(request.url).searchParams;
    const page = Number(query.get('page') ?? 1);
    const pageSize = Number(query.get('pageSize') ?? 12);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
      return HttpResponse.json({ code: 'INVALID_QUERY', message: 'Некорректные параметры запроса.', errors: {
        ...(!Number.isInteger(page) || page < 1 ? { page: ['Значение должно быть целым числом от 1.'] } : {}),
        ...(!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50 ? { pageSize: ['Значение должно быть целым числом от 1 до 50.'] } : {}),
      } }, { status: 400 });
    }
    if (scenario === 'slow') await delay(1500);
    if (scenario === 'network-error') return HttpResponse.error();
    if (scenario === 'error' || (scenario === 'next-page-error' && page > 1)) {
      return HttpResponse.json({ code: 'SERVICE_UNAVAILABLE', message: 'Сервис временно недоступен.' }, { status: 503 });
    }
    const source = scenario === 'empty' ? [] : news;
    const offset = (page - 1) * pageSize;
    const pageItems = source.slice(offset, offset + pageSize);
    const metadata = { items: pageItems.map(({ coverImage, ...item }) => ({
      ...item,
      coverPartId: coverImage ? `<news-${item.id}@zarya>` : null,
    })), page, pageSize, nextPage: offset + pageSize < source.length ? page + 1 : null };
    const boundary = 'zarya-news-boundary-7f4a9c2d';
    /** @type {(string|Blob)[]} */
    const body = [
      `--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\nContent-ID: <metadata>\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    ];
    for (const item of pageItems) {
      if (!item.coverImage) continue;
      body.push(`--${boundary}\r\nContent-Type: ${item.coverImage.type}\r\nContent-ID: <news-${item.id}@zarya>\r\n\r\n`);
      body.push(item.coverImage, '\r\n');
    }
    body.push(`--${boundary}--\r\n`);
    return new HttpResponse(await new Blob(body).arrayBuffer(), { headers: { 'Content-Type': `multipart/mixed; boundary="${boundary}"` } });
  })];
}
