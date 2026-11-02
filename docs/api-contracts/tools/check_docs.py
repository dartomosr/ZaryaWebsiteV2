"""Проверка локальных ссылок и HTTP/JSON-примеров документации, без сетевых запросов."""
import json
import re
from urllib.parse import unquote
from pathlib import Path
from jsonschema import Draft4Validator, FormatChecker
from contract_sources import ROOT, METHODS
from contract_rules import resolve
from validate_contract import json_schema
from contract_formats import FORMAT_CHECKER


def check_links(root=ROOT):
    errors = []
    for file in [root.parents[1] / 'README.md', *root.rglob('*.md')]:
        content = re.sub(r'```.*?```', '', file.read_text(encoding='utf8'), flags=re.S)
        for link in re.findall(r'\]\(([^)]+)\)', content):
            target, _, fragment = unquote(link.strip('<>')).partition('#')
            if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:', target):
                continue
            destination = (file.parent / target).resolve() if target else file
            if not destination.is_file():
                errors.append(f'{file.name}: отсутствует ссылка {link}')
            elif fragment and destination.suffix == '.md':
                anchors = set()
                for title in re.findall(r'^#{1,6}\s+(.+)$', destination.read_text(encoding='utf8'), re.M):
                    anchors.add(re.sub(r'[^\w\- ]', '', title.lower()).replace(' ', '-'))
                if fragment not in anchors:
                    errors.append(f'{file.name}: неизвестный якорь {link}')
    return errors


def http_requests(file=None):
    text = (file or ROOT / 'guides/EXAMPLES.md').read_text(encoding='utf8')
    lines = ['### GENERATED from EXAMPLES.md by tools/check_docs.py --write-http',
             '# Примеры контракта, не запросы к работающему серверу.',
             '# Сохраняйте cookie; обновляйте csrf после login/2FA. CMS требует отдельной staff-сессии.',
             '# ID/ETag/ключи примера заменяются реальными результатами предыдущих запросов.',
             '@baseUrl = https://api.example.test', '@csrf = REPLACE_WITH_CURRENT_CSRF', '']
    for binding, block in re.findall(r'<!-- contract: (\{[^\n]+\}) -->\s*```http\n(.*?)\n```', text, re.S):
        meta = json.loads(binding)
        if meta['kind'] != 'request':
            continue
        request = block.splitlines()
        method, path, _ = request[0].split(' ')
        lines.extend(['### ' + meta['operationId'], method + ' {{baseUrl}}' + path])
        lines.extend(line.replace('example-csrf-current', '{{csrf}}') for line in request[1:]
                     if not line.startswith('Host: '))
        lines.append('')
    return '\n'.join(lines)


def check_examples(bundle, file=None):
    file = file or ROOT / 'guides/EXAMPLES.md'
    # Каждый HTTP-блок предваряется машинно-читаемой привязкой к операции.
    text = file.read_text(encoding='utf8')
    records = re.findall(r'<!-- contract: (\{[^\n]+\}) -->\s*```http\n(.*?)\n```', text, re.S)
    errors = []
    if len(records) != text.count('```http'):
        errors.append('У каждого HTTP-примера должна быть contract-привязка')
    normalized = json_schema(bundle)
    operations = {op['operationId']: (path, method, op) for path, item in normalized['paths'].items()
                  for method, op in item.items() if method in METHODS}
    for binding, block in records:
        meta = json.loads(binding)
        path, method, op = operations[meta['operationId']]
        head, separator, body = block.partition('\n\n')
        lines = head.splitlines()
        headers = dict(line.split(': ', 1) for line in lines[1:] if ': ' in line)
        oid = meta['operationId']
        if meta['kind'] == 'request':
            parts = lines[0].split(' ')
            actual_path = parts[1].split('?')[0]
            template = re.escape(path)
            template = re.sub(r'\\\{[^}]+\\\}', '[^/]+', template)
            if parts[0] != method.upper() or not re.fullmatch(template, actual_path):
                errors.append(f'{oid}: пример не совпадает с методом/маршрутом')
            from urllib.parse import parse_qs, urlsplit
            query = parse_qs(urlsplit(parts[1]).query)
            lower_headers = {k.lower(): v for k,v in headers.items()}
            for raw in op.get('parameters', []):
                p = resolve(normalized, raw)
                value = (lower_headers.get(p['name'].lower()) if p['in'] == 'header'
                         else query.get(p['name'], [None])[0] if p['in'] == 'query' else 'path')
                if p.get('required') and value is None:
                    errors.append(f'{oid}: отсутствует {p["name"]}')
                if value is not None and p['in'] != 'path':
                    if p['schema'].get('type') == 'integer':
                        try: value = int(value)
                        except ValueError: pass
                    for error in Draft4Validator(p['schema'], format_checker=FORMAT_CHECKER).iter_errors(value):
                        errors.append(f'{oid} {p["name"]}: {error.message}')
            section = resolve(normalized, op.get('requestBody', {}))
        else:
            status = lines[0].split(' ')[1]
            if status != str(meta['status']) or status not in op['responses']:
                errors.append(f'{oid}: неописанный HTTP-статус {status}')
                continue
            section = resolve(normalized, op['responses'][status])
            for name, raw in section.get('headers', {}).items():
                if name in headers:
                    value = headers[name]
                    schema = resolve(normalized, raw)['schema']
                    if schema.get('type') == 'integer': value = int(value)
                    for error in Draft4Validator(schema).iter_errors(value):
                        errors.append(f'{oid} {name}: {error.message}')
        content = section.get('content', {})
        if not content:
            if body.strip(): errors.append(f'{oid}: неожиданное тело')
            continue
        media = headers.get('Content-Type', '').split(';')[0]
        if media not in content:
            errors.append(f'{oid}: неверный Content-Type {media}')
        elif media == 'application/json':
            try:
                data = json.loads(body)
                schema = {'components': normalized['components'], **content[media]['schema']}
                for error in Draft4Validator(schema, format_checker=FORMAT_CHECKER).iter_errors(data):
                    errors.append(f'{oid} {list(error.path)}: {error.message}')
            except json.JSONDecodeError as error:
                errors.append(f'{oid}: {error}')
    return errors, len(records)


if __name__ == '__main__':
    import argparse
    import yaml
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write-http', action='store_true', help='Обновить EXAMPLES.http из проверенных EXAMPLES.md')
    args = parser.parse_args()
    bundle = yaml.safe_load((ROOT / 'openapi.yaml').read_text(encoding='utf8'))
    errors = check_links()
    example_errors, count = check_examples(bundle)
    errors.extend(example_errors)
    generated = http_requests()
    target = ROOT / 'guides/EXAMPLES.http'
    if args.write_http and not example_errors:
        target.write_text(generated, encoding='utf8')
    elif not target.exists() or target.read_text(encoding='utf8') != generated:
        errors.append('EXAMPLES.http устарел: выполните --write-http')
    print('\n'.join(errors) if errors else f'OK: локальные ссылки/якоря и {count} HTTP-примеров')
    raise SystemExit(bool(errors))
