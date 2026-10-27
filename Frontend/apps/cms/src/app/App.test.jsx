import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import App from './App.jsx';
test('не открывает защищённые действия без серверной проверки', () => {
  const request = vi.spyOn(globalThis, 'fetch');
  try {
    render(<App />);
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Доступ пока недоступен');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  } finally { request.mockRestore(); }
});
