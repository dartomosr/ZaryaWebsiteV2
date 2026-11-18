import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/** @param {import('react').ReactElement} element */
export function renderWithProviders(element, initialPath = '/') {
  const queryClient = new QueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>{element}</MemoryRouter>
    </QueryClientProvider>,
  );
}
