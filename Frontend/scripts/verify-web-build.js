import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Проверяем готовые ресурсы, включая ошибочный production build --mode mock.
const root = fileURLToPath(new URL('../apps/web/dist/', import.meta.url));
const forbidden = /mockServiceWorker|virtual:msw|\[MSW\]|mock-news-|Вымышленный материал|Тестовые данные|next-page-error/;
/** @param {string} directory */
async function verify(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (forbidden.test(entry.name)) throw new Error(`Mock-файл в production: ${file}`);
    if (entry.isDirectory()) await verify(file);
    else if (/\.(js|html|json|map)$/.test(entry.name) && forbidden.test(await readFile(file, 'utf8'))) {
      throw new Error(`Mock-код в production: ${file}`);
    }
  }
}
await verify(root);
console.log('Production web: worker, MSW-маркеры и тестовые данные отсутствуют.');
