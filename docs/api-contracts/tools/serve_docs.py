"""Локальный read-only просмотр контракта. Ctrl+C останавливает сервер."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class DocsHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def do_GET(self):
        candidate = Path(self.translate_path(self.path)).resolve()
        if not candidate.is_relative_to(ROOT):
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self):
        candidate = Path(self.translate_path(self.path)).resolve()
        if not candidate.is_relative_to(ROOT):
            self.send_error(404)
            return
        super().do_HEAD()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8088)
    args = parser.parse_args()
    with ThreadingHTTPServer(('127.0.0.1', args.port), partial(DocsHandler, directory=str(ROOT))) as server:
        print(f'http://127.0.0.1:{args.port}/viewer/ (Ctrl+C для остановки)', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
