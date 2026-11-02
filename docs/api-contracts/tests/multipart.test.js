// Тестируется существующий клиент без изменения исходников Frontend.
import { afterEach, beforeEach, expect, test, vi } from '../../../Frontend/node_modules/vitest/dist/index.js';
import { getNews, LOAD_ERROR } from '../../../Frontend/apps/web/src/api/news.js';

const boundary = 'zarya-test-boundary';
const card = { id: 'n1', title: 'Example', summary: 'Example', coverPartId: null, publishedAt: '2026-11-02T19:00:00Z' };
const metadata = (items = [card]) => ({ items, page: 1, pageSize: 12, nextPage: null });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/7xoAAAAASUVORK5CYII=', 'base64');
const part = (id, type, body) => Buffer.concat([
  Buffer.from(`--${boundary}\r\nContent-Type: ${type}\r\nContent-ID: ${id}\r\n\r\n`),
  Buffer.isBuffer(body) ? body : Buffer.from(body), Buffer.from('\r\n'),
]);
const wire = (data = metadata(), images = []) => Buffer.concat([
  part('<metadata>', 'application/json; charset=utf-8', JSON.stringify(data)), ...images,
  Buffer.from(`--${boundary}--\r\n`),
]);
const answer = (body, type = `multipart/mixed; boundary="${boundary}"`, status = 200) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status, headers: { 'Content-Type': type } })));
};
beforeEach(() => vi.stubGlobal('window', { location: { origin: 'https://example.test' } }));
afterEach(() => vi.unstubAllGlobals());

test('empty page contains metadata only', async () => {
  answer(wire(metadata([])));
  expect(await getNews()).toEqual(metadata([]));
});
test('no-image card becomes coverImage null', async () => {
  answer(wire());
  expect((await getNews()).items[0].coverImage).toBeNull();
});
test('binary image bytes survive parsing and matching', async () => {
  answer(wire(metadata([{ ...card, coverPartId: '<n1@zarya>' }]), [part('<n1@zarya>', 'image/png', png)]));
  const image = (await getNews()).items[0].coverImage;
  expect(Buffer.from(await image.arrayBuffer())).toEqual(png);
});
test('unquoted boundary is accepted', async () => {
  answer(wire(), `multipart/mixed; boundary=${boundary}`);
  expect((await getNews()).items).toHaveLength(1);
});

const invalid = [
  ['missing boundary', () => [wire(), 'multipart/mixed']],
  ['wrong media type', () => [wire(), 'application/json']],
  ['truncated final delimiter', () => [wire().subarray(0, -5)]],
  ['wrong first Content-ID', () => [Buffer.from(wire().toString().replace('<metadata>', '<other>'))]],
  ['wrong metadata MIME', () => [Buffer.from(wire().toString().replace('application/json', 'text/plain'))]],
  ['invalid metadata JSON', () => [Buffer.concat([part('<metadata>', 'application/json', '{'), Buffer.from(`--${boundary}--\r\n`)])]],
  ['missing referenced image', () => [wire(metadata([{ ...card, coverPartId: '<missing>' }]))]],
  ['unreferenced image', () => [wire(metadata(), [part('<extra>', 'image/png', png)])]],
  ['duplicate image Content-ID', () => [wire(metadata([{ ...card, coverPartId: '<n1>' }]), [part('<n1>', 'image/png', png), part('<n1>', 'image/png', png)])]],
  ['forbidden image MIME', () => [wire(metadata([{ ...card, coverPartId: '<n1>' }]), [part('<n1>', 'image/svg+xml', png)])]],
  ['empty image', () => [wire(metadata([{ ...card, coverPartId: '<n1>' }]), [part('<n1>', 'image/png', Buffer.alloc(0))])]],
  ['shared Content-ID across cards', () => [wire(metadata([{ ...card, coverPartId: '<n1>' }, { ...card, id: 'n2', coverPartId: '<n1>' }]), [part('<n1>', 'image/png', png)])]],
  ['duplicate card id', () => [wire(metadata([card, card]))]],
  ['page mismatch', () => [wire({ ...metadata(), page: 2 })]],
  ['nonconsecutive nextPage', () => [wire({ ...metadata(), nextPage: 3 })]],
  ['empty page with nextPage', () => [wire({ ...metadata([]), nextPage: 2 })]],
  ['non-UTC date', () => [wire(metadata([{ ...card, publishedAt: '2026-11-02T19:00:00+03:00' }]))]],
  ['duplicate part header', () => [Buffer.from(wire().toString().replace('Content-ID: <metadata>', 'Content-ID: <metadata>\r\nContent-ID: <metadata>'))]],
  ['JSON error is not parsed as multipart', () => [JSON.stringify({ code: 'SERVICE_UNAVAILABLE', message: 'Example' }), 'application/json', 503]],
];
test.each(invalid)('rejects %s', async (_label, create) => {
  answer(...create());
  await expect(getNews()).rejects.toThrow(LOAD_ERROR);
});
