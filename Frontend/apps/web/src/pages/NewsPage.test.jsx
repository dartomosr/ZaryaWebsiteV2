import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';
import NewsPage from './NewsPage.jsx';
import { LOAD_ERROR } from '../api/news.js';
import { server } from '../../../../mocks/server.js';
import { news, newsHandlers } from '../../../../mocks/news.js';

const base = 'http://localhost:3000/api/';

/** @param {string} name */
function useScenario(name) {
  server.use(...newsHandlers(base, name));
}

describe('Новости через API и MSW', () => {
  test('показывает загрузку, подгружает страницы и скрывает кнопку в конце', async () => {
    render(<NewsPage />);

    expect(screen.getByRole('status')).toHaveTextContent('Загрузка');
    expect(screen.getByRole('button')).toBeDisabled();

    await screen.findByText('Тестовая новость 001');
    expect(screen.getAllByRole('article')).toHaveLength(12);

    fireEvent.click(screen.getByRole('button', { name: 'Показать ещё' }));
    await screen.findByText('Тестовая новость 024');
    expect(screen.getAllByRole('article')).toHaveLength(24);

    fireEvent.click(screen.getByRole('button', { name: 'Показать ещё' }));
    await screen.findByText('Тестовая новость 026');
    expect(screen.getAllByRole('article')).toHaveLength(26);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('показывает пустой список', async () => {
    useScenario('empty');
    render(<NewsPage />);

    await screen.findByText('Опубликованных новостей пока нет.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test.each(['error', 'network-error'])('ошибка %s допускает повторную загрузку', async name => {
    useScenario(name);
    render(<NewsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(LOAD_ERROR);
    useScenario('default');
    fireEvent.click(screen.getByRole('button', { name: 'Повторить попытку' }));
    await screen.findByText('Тестовая новость 001');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('сохраняет карточки и повторяет ту же страницу после ошибки', async () => {
    useScenario('next-page-error');
    render(<NewsPage />);

    await screen.findByText('Тестовая новость 001');
    fireEvent.click(screen.getByRole('button', { name: 'Показать ещё' }));
    await screen.findByRole('alert');
    expect(screen.getAllByRole('article')).toHaveLength(12);
    useScenario('default');
    fireEvent.click(screen.getByRole('button', { name: 'Повторить попытку' }));
    await screen.findByText('Тестовая новость 013');
    expect(screen.getAllByRole('article')).toHaveLength(24);
  });

  test('во время следующего запроса сохраняет карточки и блокирует повторные клики', async () => {
    render(<NewsPage />);
    await screen.findByText('Тестовая новость 001');

    useScenario('slow');
    fireEvent.click(screen.getByRole('button', { name: 'Показать ещё' }));

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getAllByRole('article')).toHaveLength(12);
    await screen.findByText('Тестовая новость 013', {}, { timeout: 3000 });
  });

  test('не отображает неподходящий ответ как успешную загрузку', async () => {
    server.use(http.get(base + 'news', () => HttpResponse.json({ items: [] })));
    render(<NewsPage />);

    await screen.findByRole('alert');
  });

  test('отменяет запрос при уходе со страницы', async () => {
    let aborted = false;
    let started = false;

    server.use(http.get(base + 'news', async ({ request }) => {
      request.signal.addEventListener('abort', () => {
        aborted = true;
      });
      started = true;

      await delay(100);

      return HttpResponse.json([]);
    }));

    const view = render(<NewsPage />);
    await waitFor(() => expect(started).toBe(true));

    view.unmount();
    await waitFor(() => expect(aborted).toBe(true));
  });

  test('не теряет данные из-за повторного эффекта StrictMode', async () => {
    const { StrictMode } = await import('react');
    render(
      <StrictMode>
        <NewsPage />
      </StrictMode>,
    );

    await screen.findByText('Тестовая новость 001');
    expect(screen.getAllByRole('article')).toHaveLength(12);
  });

  test('после полной страницы запрашивает пустую только по клику и скрывает кнопку', async () => {
    const pages = /** @type {number[]} */ ([]);

    server.use(http.get(base + 'news', ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page'));
      pages.push(page);
      return HttpResponse.json(page === 1 ? news.slice(0, 12) : []);
    }));
    render(<NewsPage />);

    await screen.findByText('Тестовая новость 001');
    expect(pages).toEqual([1]);
    fireEvent.click(screen.getByRole('button', { name: 'Показать ещё' }));
    await waitFor(() => expect(screen.queryByRole('button')).not.toBeInTheDocument());
    expect(pages).toEqual([1, 2]);
    expect(screen.getAllByRole('article')).toHaveLength(12);
  });

  test('не добавляет повторные id внутри страницы и между страницами', async () => {
    server.use(http.get(base + 'news', ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page'));
      const pageItems = page === 1 ? news.slice(0, 12) : [news[0], news[12], news[12]];

      return HttpResponse.json(pageItems);
    }));
    render(<NewsPage />);
    await screen.findByText('Тестовая новость 001');
    fireEvent.click(screen.getByRole('button', { name: 'Показать ещё' }));
    await screen.findByText('Тестовая новость 013');
    expect(screen.getAllByRole('article')).toHaveLength(13);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('повторные клики отправляют только один запрос следующей страницы', async () => {
    render(<NewsPage />);
    await screen.findByText('Тестовая новость 001');
    let requests = 0;

    server.use(http.get(base + 'news', async () => {
      requests += 1;
      await delay(50);
      return HttpResponse.json(news.slice(12, 24));
    }));

    const button = screen.getByRole('button', { name: 'Показать ещё' });
    fireEvent.click(button);
    fireEvent.click(button);

    await screen.findByText('Тестовая новость 013');
    expect(requests).toBe(1);
  });

  test('передаёт coverUrl в lazy img при другом origin API и скрывает сломанную обложку', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/api/');
    server.use(http.get('https://api.example.test/api/news', () => HttpResponse.json([news[0]])));

    try {
      const view = render(<NewsPage />);
      await screen.findByText('Тестовая новость 001');
      const image = view.container.querySelector('img');

      if (!image) {
        throw new Error('Обложка не найдена');
      }

      expect(image).toHaveAttribute('src', 'https://api.example.test/api/images/mock-news-1');
      expect(image).toHaveAttribute('loading', 'lazy');

      fireEvent.error(image);
      expect(image).not.toBeVisible();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
