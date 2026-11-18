import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from '../App.jsx';
test('главная показывает последние новости и общую навигацию', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1, name: 'ЗАРЯ: Марш Революции' })).toBeInTheDocument();
  await screen.findByText('Тестовая новость 001');
  expect(screen.getAllByRole('article')).toHaveLength(3);
  expect(screen.getByRole('link', { name: 'Главная' })).toHaveAttribute('aria-current', 'page');
});

test('маршрут новостей выбирает страницу списка', async () => {
  window.history.replaceState({}, '', '/news');
  render(<App />);
  expect(screen.getByRole('heading', { level: 1, name: 'Новости' })).toBeInTheDocument();
  await screen.findByText('Тестовая новость 001');
  expect(screen.getAllByRole('article')).toHaveLength(12);
});
