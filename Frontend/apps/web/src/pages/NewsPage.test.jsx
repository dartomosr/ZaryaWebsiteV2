import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';
import NewsPage from './NewsPage.jsx';
import { LOAD_ERROR } from '../api/news.js';
import { server } from '../../../../mocks/server.js';
import { newsHandlers } from '../../../../mocks/news.js';

const base = 'http://localhost:3000/api/';
/** @param {string} scenario */
function scenario(scenario) { server.use(...newsHandlers(base, scenario)); }

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
    scenario('empty'); render(<NewsPage />);
    await screen.findByText('Опубликованных новостей пока нет.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test.each(['error', 'network-error'])('ошибка %s допускает повторную загрузку', async name => {
    scenario(name); render(<NewsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(LOAD_ERROR);
    scenario('default');
    fireEvent.click(screen.getByRole('button', { name: 'Повторить попытку' }));
    await screen.findByText('Тестовая новость 001');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('сохраняет карточки и повторяет ту же страницу после ошибки', async () => {
    scenario('next-page-error'); render(<NewsPage />);
    await screen.findByText('Тестовая новость 001');
    fireEvent.click(screen.getByRole('button', { name: 'Показать ещё' }));
    await screen.findByRole('alert');
    expect(screen.getAllByRole('article')).toHaveLength(12);
    scenario('default');
    fireEvent.click(screen.getByRole('button', { name: 'Повторить попытку' }));
    await screen.findByText('Тестовая новость 013');
    expect(screen.getAllByRole('article')).toHaveLength(24);
  });

  test('во время следующего запроса сохраняет карточки и блокирует повторные клики', async () => {
    render(<NewsPage />); await screen.findByText('Тестовая новость 001');
    scenario('slow'); fireEvent.click(screen.getByRole('button', { name: 'Показать ещё' }));
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getAllByRole('article')).toHaveLength(12);
    await screen.findByText('Тестовая новость 013', {}, { timeout: 3000 });
  });

  test('не отображает неподходящий ответ как успешную загрузку', async () => {
    server.use(http.get(base + 'news', () => HttpResponse.json({ items: [] })));
    render(<NewsPage />); await screen.findByRole('alert');
  });

  test('отменяет запрос при уходе со страницы', async () => {
    let aborted = false;
    let started = false;
    server.use(http.get(base + 'news', async ({ request }) => {
      request.signal.addEventListener('abort', () => { aborted = true; });
      started = true;
      await delay(100);
      return HttpResponse.json({ items: [], page: 1, pageSize: 12, nextPage: null });
    }));
    const view = render(<NewsPage />);
    await waitFor(() => expect(started).toBe(true));
    view.unmount();
    await waitFor(() => expect(aborted).toBe(true));
  });

  test('не теряет данные из-за повторного эффекта StrictMode', async () => {
    const { StrictMode } = await import('react');
    render(<StrictMode><NewsPage /></StrictMode>);
    await screen.findByText('Тестовая новость 001');
    expect(screen.getAllByRole('article')).toHaveLength(12);
  });
});
