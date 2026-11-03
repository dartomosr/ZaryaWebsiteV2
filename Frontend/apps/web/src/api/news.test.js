import { expect, test, vi } from 'vitest';
import { http, HttpResponse } from 'msw/http';
import { HttpNetworkFrame } from 'msw/experimental';
import { server } from '../../../../mocks/server.js';
import { getNews, LOAD_ERROR } from './news.js';
import { unhandledApi } from '../../../../mocks/scenarios.js';
import { news, newsHandlers } from '../../../../mocks/news.js';

const base = 'http://localhost:3000/api/';

test('валидирует параметры до отправки запроса', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');

  try {
    await expect(getNews({ page: 0 })).rejects.toThrow(LOAD_ERROR);
    await expect(getNews({ pageSize: 51 })).rejects.toThrow(LOAD_ERROR);
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    fetchSpy.mockRestore();
  }
});
test('mock возвращает 400 и ошибки параметров', async () => {
  const response = await fetch(base + 'news?page=0&pageSize=51');

  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({
    code: 'INVALID_QUERY',
    errors: {
      page: expect.any(Array),
      pageSize: expect.any(Array),
    },
  });
});
test('страница за концом списка пуста', async () => {
  expect(await getNews({ page: 100 })).toEqual([]);
});
test('получает JSON-массив с обложками и параметрами страницы', async () => {
  let requestedUrl;
  let accept;

  server.use(http.get(base + 'news', ({ request }) => {
    requestedUrl = request.url;
    accept = request.headers.get('accept');
    return HttpResponse.json(news.slice(12, 24));
  }));

  const result = await getNews({ page: 2 });

  expect(result).toHaveLength(12);
  expect(result[0]).toEqual({
    ...news[12],
    coverUrl: 'http://localhost:3000/api/images/mock-news-13',
  });
  expect(requestedUrl).toBe(base + 'news?page=2&pageSize=12');
  expect(accept).toBe('application/json');
});

test.each([
  '/api/images/123',
  'api/images/123',
  'https://cdn.example.test/cover.png',
])(
  'разрешает coverUrl %s относительно origin API', async coverUrl => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/api/');
    server.use(http.get('https://api.example.test/api/news', () => {
      return HttpResponse.json([{ ...news[0], coverUrl }]);
    }));

    try {
      const result = await getNews();
      const expectedUrl = coverUrl.startsWith('https:')
        ? coverUrl
        : 'https://api.example.test/api/images/123';

      expect(result[0].coverUrl).toBe(expectedUrl);
    } finally {
      vi.unstubAllEnvs();
    }
  },
);

test('принимает дату с часовым смещением по контракту date-time', async () => {
  const publishedAt = '2026-11-03T13:00:00+03:00';

  server.use(http.get(base + 'news', () => {
    return HttpResponse.json([{ ...news[0], publishedAt }]);
  }));

  const result = await getNews();

  expect(result[0].publishedAt).toBe(publishedAt);
});

test.each([
  { items: [] },
  [null],
  [{ ...news[0], id: '' }],
  [{ ...news[0], coverUrl: null }],
  [{ ...news[0], coverUrl: '' }],
  [{ ...news[0], coverUrl: 'not a url' }],
  [{ ...news[0], coverUrl: 'javascript:alert(1)' }],
  [{ ...news[0], publishedAt: '2026-11-03' }],
  [{ ...news[0], extra: true }],
  [{ id: '1', title: '', summary: '', publishedAt: news[0].publishedAt }],
  news,
])('отклоняет ответ, не соответствующий контракту: %j', async data => {
  server.use(http.get(base + 'news', () => HttpResponse.json(data)));

  await expect(getNews()).rejects.toThrow(LOAD_ERROR);
});

test('mock выдаёт обложку отдельным GET-запросом', async () => {
  server.use(...newsHandlers(base));
  const response = await fetch(base + 'images/mock-news-1');

  expect(response.headers.get('content-type')).toBe('image/png');
  expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
});
test('неправильный JSON превращается в ошибку загрузки', async () => {
  server.use(http.get(base + 'news', () => {
    return new HttpResponse('not json', {
      headers: { 'Content-Type': 'application/json' },
    });
  }));

  await expect(getNews()).rejects.toThrow(LOAD_ERROR);
});

test('отклоняет успешный ответ с неподходящим Content-Type', async () => {
  server.use(http.get(base + 'news', () => HttpResponse.text('[]')));

  await expect(getNews()).rejects.toThrow(LOAD_ERROR);
});
test('неизвестный API-запрос блокируется', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});

  try {
    await expect(fetch(base + 'unknown')).rejects.toThrow();
  } finally {
    log.mockRestore();
  }
});
test('политика пропускает ресурсы Vite и блокирует только выбранный API', async () => {
  const defaults = { error: vi.fn(), warn: vi.fn() };
  const resourceUrls = [
    'http://localhost:3000/@vite/client',
    'http://localhost:3000/src/main.jsx',
    'http://localhost:3000/image.webp',
    'http://other.test/api/news',
  ];

  for (const url of resourceUrls) {
    await policy(url);
  }

  expect(defaults.error).not.toHaveBeenCalled();
  await policy(base + 'unknown');
  expect(defaults.error).toHaveBeenCalledOnce();

  /** @param {string} url */
  async function policy(url) {
    const handler = unhandledApi(base);
    const frame = Object.assign(Object.create(HttpNetworkFrame.prototype), {
      data: { request: new Request(url) },
    });

    if (typeof handler === 'function') {
      await handler({ frame, defaults });
    }
  }
});
