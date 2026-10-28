import { setupServer } from 'msw/node';
import { newsHandlers } from './news.js';
export const server = setupServer(...newsHandlers('http://localhost:3000/api/'));
