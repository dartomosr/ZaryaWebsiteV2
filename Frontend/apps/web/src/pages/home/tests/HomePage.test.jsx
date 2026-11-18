import { fireEvent, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { server } from '../../../../../../mocks/server.js';
import { newsHandlers } from '../../../../../../mocks/news.js';
import { renderWithProviders } from '../../../shared/tests/renderWithProviders.jsx';
import HomePage from '../ui/HomePage.jsx';

const base = 'http://localhost:3000/api/';

test('главная показывает только три последние новости без пагинации', async () => {
  renderWithProviders(<HomePage />);
  await screen.findByText('Тестовая новость 003');
  expect(screen.getAllByRole('article')).toHaveLength(3);
  expect(screen.queryByText('Тестовая новость 004')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Показать ещё' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Все новости/ })).toHaveAttribute(
    'href',
    '/news',
  );
});

test('пустой ответ не скрывает главную', async () => {
  server.use(...newsHandlers(base, 'empty'));
  renderWithProviders(<HomePage />);
  await screen.findByText('Опубликованных новостей пока нет.');
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
});

test('ошибка последних новостей допускает повторную попытку', async () => {
  server.use(...newsHandlers(base, 'error'));
  renderWithProviders(<HomePage />);
  await screen.findByRole('alert');
  server.use(...newsHandlers(base));
  fireEvent.click(screen.getByRole('button', { name: 'Повторить попытку' }));
  await screen.findByText('Тестовая новость 001');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
