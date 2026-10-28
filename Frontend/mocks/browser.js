import { network } from 'virtual:msw';
import { newsHandlers } from './news.js';
import { scenarios, unhandledApi } from './scenarios.js';
import { apiBaseUrl } from '../apps/web/src/api/news.js';

export async function enableMocking() {
  const scenario = import.meta.env.VITE_MOCK_SCENARIO || 'default';
  if (!scenarios.includes(scenario)) throw new Error(`Неизвестный MSW-сценарий: ${scenario}`);
  network.configure({ handlers: newsHandlers(apiBaseUrl(), scenario), onUnhandledFrame: unhandledApi(apiBaseUrl()) });
  await network.enable();
}
