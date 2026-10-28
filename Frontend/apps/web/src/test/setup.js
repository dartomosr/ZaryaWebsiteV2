import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '../../../../mocks/server.js';
import { unhandledApi } from '../../../../mocks/scenarios.js';
beforeAll(() => server.listen({ onUnhandledFrame: unhandledApi('http://localhost:3000/api/') }));
afterEach(() => { cleanup(); server.resetHandlers(); window.history.replaceState({}, '', '/'); });
afterAll(() => server.close());
