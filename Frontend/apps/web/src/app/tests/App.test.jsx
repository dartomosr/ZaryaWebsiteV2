import { fireEvent, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../shared/tests/renderWithProviders.jsx';
import App from '../App.jsx';
test('главная показывает последние новости и общую навигацию', async () => {
  renderWithProviders(<App />);
  expect(
    screen.getByRole('heading', { level: 1, name: 'ЗАРЯ: Марш Революции' }),
  ).toBeInTheDocument();
  await screen.findByText('Тестовая новость 001');
  expect(screen.getAllByRole('article')).toHaveLength(3);
  expect(screen.getByRole('link', { name: 'Главная' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('маршрут новостей выбирает страницу списка', async () => {
  renderWithProviders(<App />, '/news');
  expect(
    screen.getByRole('heading', { level: 1, name: 'Новости' }),
  ).toBeInTheDocument();
  await screen.findByText('Тестовая новость 001');
  expect(screen.getAllByRole('article')).toHaveLength(12);
});

test('неизвестный маршрут показывает страницу 404', () => {
  renderWithProviders(<App />, '/unknown');
  expect(
    screen.getByRole('heading', { level: 1, name: 'Страница не найдена' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute(
    'href',
    '/',
  );
});

test.each([
  ['/updates', 'Обновления'],
  ['/materials', 'Материалы'],
  ['/login', 'Вход'],
])('маршрут %s открывает заглушку раздела', (path, title) => {
  renderWithProviders(<App />, path);

  expect(
    screen.getByRole('heading', { level: 1, name: title }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: title })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('при смене раздела ссылки шапки сохраняются в DOM, а меню закрывается', () => {
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

  try {
    renderWithProviders(<App />, '/materials');
    const homeLink = screen.getByRole('link', { name: 'Главная' });
    const materialsLink = screen.getByRole('link', { name: 'Материалы' });
    const menuToggle = screen.getByText('Меню', { selector: 'button' });

    fireEvent.click(menuToggle);
    expect(menuToggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('link', { name: 'На главную' }));

    expect(screen.getByRole('link', { name: 'Главная' })).toBe(homeLink);
    expect(homeLink).toHaveAttribute('aria-current', 'page');
    expect(materialsLink).not.toHaveAttribute('aria-current');
    expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
  } finally {
    scrollTo.mockRestore();
  }
});

test('при возврате в новости сохраняет ранее загруженные страницы', async () => {
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

  try {
    renderWithProviders(<App />, '/news');
    await screen.findByText('Тестовая новость 012');
    fireEvent.click(screen.getByRole('button', { name: 'Показать ещё' }));
    await screen.findByText('Тестовая новость 024');

    fireEvent.click(screen.getByRole('link', { name: 'Главная' }));
    await screen.findByText('Тестовая новость 003');
    expect(screen.getAllByRole('article')).toHaveLength(3);

    fireEvent.click(screen.getByRole('link', { name: 'Новости' }));
    expect(screen.getByRole('link', { name: 'Новости' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('main')).toHaveFocus();
    expect(screen.getAllByRole('article')).toHaveLength(24);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  } finally {
    scrollTo.mockRestore();
  }
});
