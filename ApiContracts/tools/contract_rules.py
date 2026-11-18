"""Смысловые инварианты проекта поверх официальной схемы OAS, без обращения к backend."""
import re
from contract_sources import METHODS, pointer, walk


def resolve(bundle, value):
    seen = set()
    while '$ref' in value:
        ref = value['$ref']
        if ref in seen:
            raise ValueError(f'Цикл ссылок: {ref}')
        seen.add(ref)
        value = pointer(bundle, ref)
    return value


def check_rules(bundle):
    errors = []
    routes = {}
    for path, item in bundle['paths'].items():
        shape = re.sub(r'\{[^}]+\}', '{}', path).lower()
        if shape in routes:
            errors.append(f'Коллизия ASP.NET маршрутов без учёта регистра: {path}')
        routes[shape] = path
        for method, op in item.items():
            if method not in METHODS:
                continue
            oid = op['operationId']
            params = [resolve(bundle, p) for p in item.get('parameters', []) + op.get('parameters', [])]
            # Внутри каждого массива дубли запрещены; operation может переопределить path parameter.
            for group in (item.get('parameters', []), op.get('parameters', [])):
                keys = [(p['in'], p['name'].lower() if p['in'] == 'header' else p['name'])
                        for p in (resolve(bundle, p) for p in group)]
                if len(keys) != len(set(keys)):
                    errors.append(f'{oid}: повтор параметра')
            names = {p['name'].lower() for p in params if p['in'] == 'header'}
            responses = op['responses']
            if op.get('x-stability') != 'proposed':
                errors.append(f'{oid}: требуется явный статус proposed')
            if 'security' not in op:
                errors.append(f'{oid}: доступ должен быть явно задан')
            protected = bool(op.get('security'))
            if protected and (op.get('security') != [{'SessionCookie': []}] or not op.get('x-required-auth-states')):
                errors.append(f'{oid}: неполная cookie/state политика')
            for prefix, roles in (('/api/cms/', ['admin', 'owner']),
                                  ('/api/moderation/', ['moderator', 'admin', 'owner']),
                                  ('/api/admin/', ['admin', 'owner']), ('/api/owner/', ['owner'])):
                if path.startswith(prefix) and (not protected or op.get('x-permitted-roles') != roles
                                               or op.get('x-required-auth-states') != ['active']):
                    errors.append(f'{oid}: неверные права служебного маршрута')
            if protected and not {'401', '403'} <= set(responses):
                errors.append(f'{oid}: нет 401/403 для защищённой операции')
            if method in {'post', 'put', 'patch', 'delete'} and '403' not in responses:
                errors.append(f'{oid}: не описан отказ CSRF 403')
            if 'if-match' in names and not {'400', '412', '428'} <= set(responses):
                errors.append(f'{oid}: нужны 400/412/428 для If-Match')
            if '412' in responses and 'if-match' not in names and oid != 'publishPublicationBatch':
                errors.append(f'{oid}: 412 без условного запроса')
            for code, raw in responses.items():
                response = resolve(bundle, raw)
                if code in {'204', '304'} and response.get('content'):
                    errors.append(f'{oid}: {code} не может содержать тело')
                if (protected or op.get('x-sensitive-response') or path.startswith('/api/auth/')
                        or oid == 'getNewsReactionCounts'):
                    cache = resolve(bundle, response.get('headers', {}).get('Cache-Control', {}))
                    if cache.get('schema', {}).get('enum') != ['no-store']:
                        errors.append(f'{oid}: {code} должен запрещать кеширование')
                if code == '429' and 'Retry-After' not in response.get('headers', {}):
                    errors.append(f'{oid}: 429 без Retry-After')
    for name, schema in bundle['components']['schemas'].items():
        for trail, value in walk(schema):
            if value.get('additionalProperties') is False:
                missing = set(value.get('required', [])) - set(value.get('properties', {}))
                if missing:
                    errors.append(f'{name}.{trail}: required вне properties: {sorted(missing)}')
    return errors
