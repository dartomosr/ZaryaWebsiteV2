#!/usr/bin/env python3
"""Сборка и проверка модульного OpenAPI 3.0.3; не проверяет backend."""
import argparse
from collections import Counter
import json
from pathlib import Path
import re

import yaml
from jsonschema import Draft4Validator

from contract_sources import (
    ROOT, SOURCES, METHODS, UniqueKeyLoader, load_documents, pointer,
    reference_target, walk, localize, component_value, merge_unique, build_contract,
    build_core, build_index, module_names, MANIFEST, GENERATED_HEADER,
    COMMON, EXTENDED, BASELINE, INDEX,
)
from contract_compatibility import check_compatibility
from contract_rules import check_rules


def json_schema(schema):
    """Семантика nullable OAS 3.0 для JSON Schema, включая enum: [null]."""
    if isinstance(schema, list):
        return [json_schema(value) for value in schema]
    if not isinstance(schema, dict):
        return schema
    result = {key: json_schema(value) for key, value in schema.items() if key != 'nullable'}
    if schema.get('nullable') and isinstance(schema.get('type'), str):
        result['type'] = [schema['type'], 'null']
    return result


def validate(documents, oas_schema=None):
    errors = []
    for filename, document in documents.items():
        if document.get('openapi') != '3.0.3':
            errors.append(f'{filename}: ожидается OpenAPI 3.0.3')
        for trail, item in walk(document):
            if 'const' in item or isinstance(item.get('type'), list) or item.get('type') == 'null':
                errors.append(f'{filename} {trail}: конструкция JSON Schema 3.1 вместо OAS 3.0.3')
            if '$ref' in item:
                try:
                    _, _, target = reference_target(documents, filename, item['$ref'])
                    if not isinstance(target, dict):
                        raise ValueError('Цель ссылки должна быть объектом')
                    if len(item) != 1:
                        raise ValueError('Reference Object содержит игнорируемые соседние поля')
                    if filename == 'openapi.yaml' and not item['$ref'].startswith('#/'):
                        raise ValueError('Внешняя ссылка в каноническом файле')
                except (KeyError, ValueError, TypeError, IndexError) as error:
                    errors.append(f'{filename} {trail}: {error}')
        for name, schema in document.get('components', {}).get('schemas', {}).items():
            try:
                Draft4Validator.check_schema(json_schema(schema))
            except Exception as error:
                errors.append(f'{filename} schema {name}: {error}')
        if oas_schema:
            for error in Draft4Validator(oas_schema).iter_errors(document):
                errors.append(f'{filename} OAS {list(error.absolute_path)}: {error.message}')
    try:
        if documents['core.yaml'] != build_core(documents):
            errors.append('core.yaml отличается от модулей; выполните --write')
        if documents['openapi.yaml'] != build_contract(documents):
            errors.append('openapi.yaml отличается от сборки исходников; выполните --write')
    except (KeyError, ValueError) as error:
        errors.append(str(error))

    ids = []
    for filename in ('foundation.yaml', 'core.yaml', EXTENDED):
        declared_tags = {tag['name'] for tag in documents[filename].get('tags', [])}
        for path, item in documents[filename]['paths'].items():
            if not path.startswith('/api/'):
                errors.append(f'{filename}: путь без /api/: {path}')
            for method, operation in item.items():
                if method not in METHODS:
                    continue
                oid = operation.get('operationId')
                ids.append(oid)
                if not oid:
                    errors.append(f'{filename}: нет operationId у {method} {path}')
                if operation.get('x-contract-zone') != Path(filename).stem:
                    errors.append(f'{oid}: неверная метка зоны')
                if not any(str(code).startswith('2') for code in operation.get('responses', {})):
                    errors.append(f'{oid}: нет успешного ответа')
                if not set(operation.get('tags', [])) <= declared_tags:
                    errors.append(f'{oid}: необъявленный тег')
                parameters = item.get('parameters', []) + operation.get('parameters', [])
                try:
                    resolved = [reference_target(documents, filename, p['$ref'])[2]
                                if '$ref' in p else p for p in parameters]
                except (KeyError, ValueError, TypeError, IndexError) as error:
                    errors.append(f'{oid}: неразрешимый параметр: {error}')
                    continue
                path_parameters = {p['name'] for p in resolved
                                   if p.get('in') == 'path' and p.get('required') is True}
                if path_parameters != set(re.findall(r'\{([^}]+)\}', path)):
                    errors.append(f'{oid}: параметры пути не соответствуют шаблону')
                if method in {'post', 'put', 'patch', 'delete'}:
                    if not any(p.get('in') == 'header' and p.get('name') == 'X-CSRF-Token'
                               and p.get('required') is True for p in resolved):
                        errors.append(f'{oid}: отсутствует обязательный CSRF-header')
                for requirement in operation.get('security', []):
                    for scheme in requirement:
                        if scheme not in documents['openapi.yaml']['components']['securitySchemes']:
                            errors.append(f'{oid}: неизвестная security scheme {scheme}')
    for oid, count in Counter(ids).items():
        if count != 1:
            errors.append(f'Дублирующийся operationId: {oid}')

    common = documents[COMMON]['components']['schemas']
    if common['RegisterRequest']['required'] != ['username', 'displayName', 'email', 'password']:
        errors.append('Регистрация: требуется username, displayName, email, password')
    if 'owner' in common['RoleChangeRequest']['properties']['role']['enum']:
        errors.append('Роль owner назначается исключительно через transfer')
    news_schemas = documents[COMMON]['components']['schemas']
    news_response = news_schemas['NewsResponse']
    if set(news_response['required']) != {'id', 'title', 'summary', 'coverUrl', 'publishedAt'}:
        errors.append('NewsResponse должен содержать coverUrl вместе с полями новости')
    cover_url = news_response['properties']['coverUrl']
    if cover_url.get('type') != 'string' or cover_url.get('format') != 'uri-reference':
        errors.append('NewsResponse.coverUrl должен быть строкой формата uri-reference')
    news = documents['core/news.yaml']['paths']['/api/news']['get']['responses']['200']['content']
    if news != {'application/json': {'schema': {
            'type': 'array', 'items': {
                '$ref': '../shared/common.yaml#/components/schemas/NewsResponse'}}}}:
        errors.append('GET /api/news должен возвращать массив NewsResponse в JSON')
    media = documents['core/media.yaml']['paths'].get('/api/media/{mediaId}', {}).get('get', {})
    media_content = media.get('responses', {}).get('200', {}).get('content', {})
    expected_image_types = {'image/jpeg', 'image/png', 'image/webp'}
    if media.get('operationId') != 'getPublicMedia' or set(media_content) != expected_image_types:
        errors.append('GET /api/media/{mediaId} должен выдавать JPEG, PNG и WebP')
    elif any(value.get('schema', {}).get('type') != 'string'
             or value.get('schema', {}).get('format') != 'binary'
             for value in media_content.values()):
        errors.append('Ответ GET /api/media/{mediaId} должен описывать бинарные данные')
    if documents['core.yaml'].get('x-stability') != 'proposed':
        errors.append('Зона 2 должна оставаться PROPOSED')
    if documents[EXTENDED].get('x-stability') != 'proposed':
        errors.append('Зона 3 должна оставаться PROPOSED')
    for path, item in documents[EXTENDED]['paths'].items():
        for method, operation in item.items():
            if method not in METHODS:
                continue
            if operation.get('x-stability') != 'proposed':
                errors.append(f'{method} {path}: операция зоны 3 должна оставаться PROPOSED')
            if path.startswith('/api/cms/') and (
                    operation.get('x-permitted-roles') != ['admin', 'owner']
                    or operation.get('x-required-auth-states') != ['active']
                    or operation.get('security') != [{'SessionCookie': []}]):
                errors.append(f'{method} {path}: неверные права CMS зоны 3')
    errors.extend(check_rules(documents['openapi.yaml']))
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='Пересобрать openapi.yaml перед проверкой')
    parser.add_argument('--oas-schema', type=Path, default=ROOT / 'tests/fixtures/oas30.schema.json',
                        help='Официальная JSON Schema OAS 3.0 (по умолчанию локальная копия)')
    parser.add_argument('--compare-to', type=Path, help='Сравнить общую спецификацию с прежним YAML')
    args = parser.parse_args()
    try:
        documents = load_documents(allow_missing_generated=args.write)
        if args.write:
            documents['core.yaml'] = build_core(documents)
            documents['openapi.yaml'] = build_contract(documents)
        schema = json.loads(args.oas_schema.read_text(encoding='utf8')) if args.oas_schema else None
        errors = validate(documents, schema)
        baseline = json.loads((ROOT / BASELINE).read_text(encoding='utf8'))
        errors.extend(check_compatibility(documents, baseline))
        index = build_index(documents)
        if not args.write and (not (ROOT / INDEX).exists()
                               or (ROOT / INDEX).read_text(encoding='utf8') != index):
            errors.append('API_INDEX.md отличается от источников; выполните --write')
        if args.compare_to:
            previous = yaml.load(args.compare_to.read_text(encoding='utf8'), Loader=UniqueKeyLoader)
            if previous != documents['openapi.yaml']:
                errors.append('Сравнение --compare-to: общие спецификации структурно различаются')
        if errors:
            print('НЕ ПРОЙДЕНО:\n' + '\n'.join(f'  {error}' for error in errors))
            return 1
        # Не записывать результат при ошибке в исходниках или проверках.
        if args.write:
            for name in ('core.yaml', 'openapi.yaml'):
                (ROOT / name).write_text(GENERATED_HEADER + yaml.safe_dump(
                    documents[name], allow_unicode=True, sort_keys=False, width=100), encoding='utf8')
            (ROOT / INDEX).write_text(index, encoding='utf8')
        print(f'OK: {len(documents)} YAML, модули, ссылки, коллизии, сборка, схемы, CSRF и параметры путей.')
        print('Совместимость: проверена редакция аудита; исторические снимки сохранены отдельно.')
        for name in ('foundation.yaml', 'core.yaml', EXTENDED, 'openapi.yaml'):
            paths = documents[name]['paths']
            count = sum(method in METHODS for item in paths.values() for method in item)
            print(f'{name}: {count} HTTP-операций на {len(paths)} маршрутах')
        print('OAS JSON Schema: ' + ('OK' if schema else 'не запрошена (--oas-schema)'))
        print('ОГРАНИЧЕНИЕ: проверки не подтверждают согласование или реализацию backend.')
        return 0
    except (ValueError, KeyError, TypeError, OSError, yaml.YAMLError) as error:
        print(f'НЕ ПРОЙДЕНО: {error}')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
