import { HttpNetworkFrame } from 'msw/experimental';

export const scenarios = ['default', 'empty', 'slow', 'error', 'network-error', 'next-page-error'];

/** Неизвестные запросы нашего API не должны уходить в реальную сеть.
 * @param {string} baseUrl
 * @returns {import('msw').UnhandledFrameHandle}
 */
export function unhandledApi(baseUrl) {
  const base = new URL(baseUrl);
  const prefix = base.pathname.replace(/\/$/, '');
  return ({ frame, defaults }) => {
    if (!(frame instanceof HttpNetworkFrame)) return;
    const url = new URL(frame.data.request.url);
    if (url.origin === base.origin && (url.pathname === prefix || url.pathname.startsWith(prefix + '/'))) {
      defaults.error();
    }
  };
}
