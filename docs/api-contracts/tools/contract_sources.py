#!/usr/bin/env python3
"""Сборка и проверка локального OpenAPI 3.0.3; не проверяет реализацию backend."""
from copy import deepcopy
from pathlib import Path
import posixpath
import re
from urllib.parse import unquote

import yaml

ROOT = Path(__file__).resolve().parents[1]
COMMON = 'shared/common.yaml'
EXTENDED = 'extended.yaml'
BASELINE = 'tests/fixtures/compatibility-baseline.json'
EXTENDED_BASELINE = 'tests/fixtures/extended-baseline.json'
INDEX = 'guides/API_INDEX.md'
SOURCES = (COMMON, 'foundation.yaml', 'core.yaml', EXTENDED)
METHODS = {'get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'}


class UniqueKeyLoader(yaml.SafeLoader):
    """SafeLoader с запретом повторных ключей вместо молчаливой перезаписи."""


def unique_mapping(loader, node, deep=False):
    loader.flatten_mapping(node)
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in result:
            raise ValueError(f'Повторный YAML-ключ {key!r}, строка {key_node.start_mark.line + 1}')
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


UniqueKeyLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)


MANIFEST = 'core/manifest.yaml'
GENERATED_HEADER = '# GENERATED; edit source YAML (see README.md); run tools/validate_contract.py --write.\n'


def module_names(documents):
    names = [posixpath.normpath(posixpath.join('core', name))
             for name in documents[MANIFEST]['x-modules']]
    if len(names) != len(set(names)):
        raise ValueError('Повторный модуль в manifest.yaml')
    if any(not name.startswith('core/') or name == MANIFEST
           or posixpath.dirname(name) != 'core' or not name.endswith('.yaml') for name in names):
        raise ValueError('Модули должны находиться непосредственно в core/*.yaml')
    return names


def load_documents(root=ROOT, allow_missing_generated=False):
    def read(name):
        return yaml.load((root / name).read_text(encoding='utf8'), Loader=UniqueKeyLoader)
    documents = {MANIFEST: read(MANIFEST)}
    modules = module_names(documents)
    discovered = {p.relative_to(root).as_posix() for p in (root / 'core').glob('*.yaml')}
    if discovered != {*modules, MANIFEST}:
        raise ValueError(f'Незарегистрированные или отсутствующие модули: '
                         f'{sorted(discovered.symmetric_difference({*modules, MANIFEST}))}')
    for name in (*SOURCES, 'openapi.yaml', *modules):
        if allow_missing_generated and name in {'core.yaml', 'openapi.yaml'}:
            # Генерация зависит только от источников, даже если старый артефакт повреждён.
            documents[name] = {}
        else:
            documents[name] = read(name)
    return documents


def pointer(document, fragment):
    fragment = unquote(fragment)
    if not fragment.startswith('#/'):
        raise ValueError(f'Неверный указатель {fragment}')
    target = document
    for part in fragment[2:].split('/'):
        part = part.replace('~1', '/').replace('~0', '~')
        target = target[int(part)] if isinstance(target, list) else target[part]
    return target


def reference_target(documents, filename, reference):
    name, separator, fragment = reference.partition('#')
    if not separator:
        raise ValueError(f'Неподдерживаемая ссылка {reference}')
    name = posixpath.normpath(posixpath.join(posixpath.dirname(filename), name)) if name else filename
    if name not in documents:
        raise ValueError(f'Ссылка за пределы локального комплекта: {reference}')
    return name, '#' + fragment, pointer(documents[name], '#' + fragment)


def walk(item, trail='root'):
    if isinstance(item, dict):
        yield trail, item
        for key, value in item.items():
            yield from walk(value, f'{trail}.{key}')
    elif isinstance(item, list):
        for index, value in enumerate(item):
            yield from walk(value, f'{trail}[{index}]')


def localize(item, filename, documents):
    """Проверить исходную ссылку до переноса в общее пространство компонентов."""
    if isinstance(item, list):
        return [localize(value, filename, documents) for value in item]
    if not isinstance(item, dict):
        return deepcopy(item)
    result = {key: localize(value, filename, documents) for key, value in item.items()}
    if '$ref' in item:
        _, fragment, _ = reference_target(documents, filename, item['$ref'])
        if not fragment.startswith('#/components/'):
            raise ValueError(f'Сборка поддерживает ссылки на components: {item["$ref"]}')
        result['$ref'] = fragment
    return result


def component_value(value, filename, documents, seen=()):
    # SessionCookie в зонах ссылается на общий security scheme.
    # После сборки здесь нужен объект, а не ссылка на самого себя.
    if isinstance(value, dict) and '$ref' in value:
        if len(value) != 1:
            raise ValueError('Соседние поля у Reference Object недопустимы в OAS 3.0.3')
        name, fragment, target = reference_target(documents, filename, value['$ref'])
        identity = (name, fragment)
        if identity in seen:
            raise ValueError(f'Цикл псевдонимов компонентов: {identity}')
        return component_value(target, name, documents, (*seen, identity))
    return localize(value, filename, documents)


def merge_unique(target, key, value, context):
    if key in target and target[key] != value:
        raise ValueError(f'Коллизия {context}: {key}')
    target[key] = value


def check_module_graph(documents):
    """Модули зависят только от других исходников и common; межфайловых циклов нет."""
    modules = module_names(documents)
    graph = {name: set() for name in modules}
    for name in modules:
        if documents[name].get('x-stability') != 'proposed':
            raise ValueError(f'{name}: модуль должен оставаться PROPOSED')
        for _, item in walk(documents[name]):
            if '$ref' not in item:
                continue
            target, _, _ = reference_target(documents, name, item['$ref'])
            if target not in {*modules, COMMON}:
                raise ValueError(f'{name}: ссылка на генерируемый или недопустимый источник {target}')
            if target != name and target in graph:
                graph[name].add(target)
    visited = set()

    def visit(name, active):
        if name in active:
            raise ValueError(f'Циклическая зависимость модулей: {name}')
        if name not in visited:
            for dependency in sorted(graph[name]):
                visit(dependency, {*active, name})
            visited.add(name)
    for name in modules:
        visit(name, set())
    return graph


def build_core(documents):
    check_module_graph(documents)
    modules = module_names(documents)
    manifest = documents[MANIFEST]
    result = {key: deepcopy(value) for key, value in manifest.items() if key != 'x-modules'}
    if result.get('paths') or result.get('components'):
        raise ValueError('manifest.yaml содержит только метаданные, не операции или компоненты')
    result['paths'] = {}
    result['components'] = {}
    inline = set()
    for filename in modules:
        for fragment in documents[filename].get('x-inline-components', []):
            if not fragment.startswith(('#/components/parameters/', '#/components/headers/')):
                raise ValueError(f'{filename}: разворачивать можно только параметры и заголовки')
            pointer(documents[filename], fragment)
            inline.add((filename, fragment))

    def rebase(item, filename, active=()):
        if isinstance(item, list):
            return [rebase(value, filename, active) for value in item]
        if not isinstance(item, dict):
            return deepcopy(item)
        if '$ref' in item:
            if len(item) != 1:
                raise ValueError(f'{filename}: соседние поля у Reference Object')
            target, fragment, value = reference_target(documents, filename, item['$ref'])
            if (target, fragment) in inline:
                if (target, fragment) in active:
                    raise ValueError('Цикл разворачиваемых компонентов')
                return rebase(value, target, (*active, (target, fragment)))
            if not fragment.startswith('#/components/'):
                raise ValueError(f'{filename}: поддерживаются ссылки на components')
            prefix = './' + COMMON if target == COMMON else ''
            return {'$ref': prefix + fragment}
        return {key: rebase(value, filename, active) for key, value in item.items()}

    for filename in modules:
        source = documents[filename]
        if source.get('openapi') != '3.0.3':
            raise ValueError(f'{filename}: ожидается OpenAPI 3.0.3')
        if source.get('security') or source.get('servers'):
            raise ValueError(f'{filename}: общие security/servers задаются только в manifest')
        for path, item in source['paths'].items():
            target = result['paths'].setdefault(path, {})
            for method, value in item.items():
                if method in target:
                    raise ValueError(f'Коллизия HTTP-операции в модулях: {method} {path}')
                target[method] = rebase(value, filename)
        for group, entries in source.get('components', {}).items():
            for name, value in entries.items():
                if (filename, f'#/components/{group}/{name}') in inline:
                    continue
                target = result['components'].setdefault(group, {})
                if name in target:
                    raise ValueError(f'Коллизия компонентов модулей: {group}/{name}')
                target[name] = rebase(value, filename)
    identifiers = [op['operationId'] for item in result['paths'].values()
                   for method, op in item.items() if method in METHODS]
    if len(identifiers) != len(set(identifiers)):
        raise ValueError('Коллизия operationId в модулях')
    return result


def build_index(documents):
    """Индекс только генерируется: отдельной редактируемой таблицы операций нет."""
    lines = ['# Индекс API', '', '<!-- GENERATED: tools/validate_contract.py --write -->', '',
             'Статус: **PROPOSED**. Редактируйте исходный модуль, не эту таблицу.', '',
             'Оглавление: [foundation](#foundation), [core](#core), [extended](#extended).', '']
    sources = ('foundation.yaml', *module_names(documents), EXTENDED)
    last_zone = None
    for filename in sources:
        if not documents[filename]['paths']:
            continue
        zone = documents[filename]['x-contract-zone']
        if zone != last_zone:
            lines.extend([f'## {zone}', ''])
            last_zone = zone
        lines.extend([f'### {filename}', '', '| Метод | Маршрут | operationId | Источник |', '|---|---|---|---|'])
        for path, item in sorted(documents[filename]['paths'].items()):
            for method, operation in sorted(item.items()):
                if method in METHODS:
                    lines.append(f'| {method.upper()} | `{path}` | `{operation["operationId"]}` '
                                 f'| [{filename}](../{filename}) |')
        lines.append('')
    return '\n'.join(lines) + '\n'


def build_contract(documents):
    has_extended = bool(documents[EXTENDED]['paths'])
    result = {
        'openapi': '3.0.3',
        'info': {
            'title': ('ZaryaWebsite API - FOUNDATION + CORE + EXTENDED' if has_extended
                      else 'ZaryaWebsite API - FOUNDATION + CORE'),
            'version': '0.5.0-proposed' if has_extended else '0.2.0-proposed',
            'description': ('PROPOSED: зоны 1, 2 и 3 не утверждены backend-разработчиком. '
                            'Собрано из локальных исходников зон и общих компонентов.' if has_extended else
                            'PROPOSED: зоны 1 и 2 не утверждены backend-разработчиком. '
                           'Собрано из локальных common.yaml, foundation.yaml, core.yaml '
                           'и extended.yaml. Зона 3 зарезервирована.'),
        },
        'servers': deepcopy(documents['foundation.yaml']['servers']),
        'tags': [], 'paths': {}, 'components': {}, 'x-stability': 'proposed',
    }
    tags = {}
    for filename in SOURCES:
        source = documents[filename]
        if source['openapi'] != '3.0.3':
            raise ValueError(f'{filename}: ожидается OpenAPI 3.0.3')
        for tag in source.get('tags', []):
            merge_unique(tags, tag['name'], deepcopy(tag), f'tags ({filename})')
        for path, path_item in source['paths'].items():
            target = result['paths'].setdefault(path, {})
            for method, value in path_item.items():
                if method in METHODS and method in target:
                    raise ValueError(f'Коллизия HTTP-операции: {method.upper()} {path} ({filename})')
                merge_unique(target, method, localize(value, filename, documents), f'paths.{path}')
        for group, components in source.get('components', {}).items():
            target = result['components'].setdefault(group, {})
            for name, value in components.items():
                merge_unique(target, name, component_value(value, filename, documents),
                             f'components.{group} ({filename})')
        if source.get('security'):
            raise ValueError(f'{filename}: глобальная security требует явного согласования сборки')
    result['tags'] = list(tags.values())
    templates = {}
    for path in result['paths']:
        shape = re.sub(r'\{[^}]+\}', '{}', path)
        if shape in templates and templates[shape] != path:
            raise ValueError(f'Коллизия шаблонов маршрутов: {templates[shape]} и {path}')
        templates[shape] = path
    identifiers = [operation['operationId'] for item in result['paths'].values()
                   for method, operation in item.items() if method in METHODS]
    if len(identifiers) != len(set(identifiers)):
        raise ValueError('Коллизия operationId между зонами')
    return result

