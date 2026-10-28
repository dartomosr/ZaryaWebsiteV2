import { expect, test, vi } from 'vitest';
import { http, HttpResponse } from 'msw/http';
import { server } from '../../../../mocks/server.js';
import { getNews, LOAD_ERROR } from './news.js';
import { unhandledApi } from '../../../../mocks/scenarios.js';
import { HttpNetworkFrame } from 'msw/experimental';

const base = 'http://localhost:3000/api/';
test('валидирует параметры до отправки запроса', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  try {
    await expect(getNews({ page: 0 })).rejects.toThrow(LOAD_ERROR);
    await expect(getNews({ pageSize: 51 })).rejects.toThrow(LOAD_ERROR);
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally { fetchSpy.mockRestore(); }
});
test('mock возвращает 400 и ошибки параметров', async () => {
  const response = await fetch(base + 'news?page=0&pageSize=51');
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: 'INVALID_QUERY', errors: { page: expect.any(Array), pageSize: expect.any(Array) } });
});
test('страница за концом списка пуста', async () => {
  expect(await getNews({ page: 100 })).toMatchObject({ items: [], nextPage: null });
});
test('неправильный JSON превращается в ошибку загрузки', async () => {
  server.use(http.get(base + 'news', () => HttpResponse.text('not json')));
  await expect(getNews()).rejects.toThrow();
});
test('неизвестный API-запрос блокируется', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try { await expect(fetch(base + 'unknown')).rejects.toThrow(); }
  finally { log.mockRestore(); }
});
test('политика пропускает ресурсы Vite и блокирует только выбранный API', async () => {
  const defaults = { error: vi.fn(), warn: vi.fn() };
  for (const url of ['http://localhost:3000/@vite/client', 'http://localhost:3000/src/main.jsx', 'http://localhost:3000/image.webp', 'http://other.test/api/news']) {
    await policy(url);
  }
  expect(defaults.error).not.toHaveBeenCalled();
  await policy(base + 'unknown');
  expect(defaults.error).toHaveBeenCalledOnce();
  /** @param {string} url */
  async function policy(url) {
    const handler = unhandledApi(base);
    const frame = Object.assign(Object.create(HttpNetworkFrame.prototype), { data: { request: new Request(url) } });
    if (typeof handler === 'function') await handler({ frame, defaults });
  }
});
