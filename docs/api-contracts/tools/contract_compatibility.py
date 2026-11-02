"""Сравнение со снимком до модульного рефакторинга без копии редактируемых DTO."""
import hashlib
import json
from copy import deepcopy

from contract_sources import ROOT, METHODS, COMMON, EXTENDED, EXTENDED_BASELINE


def digest(value):
    serialized = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(serialized.encode('utf8')).hexdigest()


def legacy_core_references(value):
    """Снимок неизменен: нормализуется только согласованный перенос common.yaml."""
    if isinstance(value, list):
        return [legacy_core_references(item) for item in value]
    if not isinstance(value, dict):
        return value
    result = {key: legacy_core_references(item) for key, item in value.items()}
    reference = result.get('$ref', '')
    if reference.startswith('./shared/common.yaml#'):
        result['$ref'] = './common.yaml#' + reference.split('#', 1)[1]
    return result


def check_compatibility(documents, baseline, root=ROOT):
    audited = root / 'tests/fixtures/audit-baseline.json'
    if audited.is_file():
        return check_audited_compatibility(documents, json.loads(audited.read_text(encoding='utf8')), root)
    return check_legacy_compatibility(documents, baseline, root)


def check_audited_compatibility(documents, baseline, root=ROOT):
    """Новая разрешённая редакция: исторические снимки не перезаписываются --write."""
    errors = []
    for filename, expected in baseline['documents'].items():
        if digest(documents.get(filename)) != expected:
            errors.append(f'Несовместимость audit source: {filename}')
    if set(documents) != set(baseline['documents']):
        errors.append('Изменился состав исходников/сборок аудита')
    bundle = documents['openapi.yaml']
    operations = {f'{method.upper()} {path}': digest(op) for path, item in bundle['paths'].items()
                  for method, op in item.items() if method in METHODS}
    for label, actual in [('operations', operations), ('schemas', {
            name: digest(schema) for name, schema in bundle['components']['schemas'].items()})]:
        for name in sorted(set(actual) | set(baseline[label])):
            if actual.get(name) != baseline[label].get(name):
                errors.append(f'Несовместимость audit {label}: {name}')
    for filename, expected in baseline['historical_files'].items():
        if hashlib.sha256((root / filename).read_bytes()).hexdigest() != expected:
            errors.append(f'Исторический снимок изменён: {filename}')
    return errors


def check_legacy_compatibility(documents, baseline, root=ROOT):
    bundle = documents['openapi.yaml']
    errors = []
    extension = None
    legacy_bundle = deepcopy(bundle)
    if (root / EXTENDED_BASELINE).is_file():
        extension = json.loads((root / EXTENDED_BASELINE).read_text(encoding='utf8'))
        for name, expected in extension['operations'].items():
            method, path = name.split(' ', 1)
            operation = bundle['paths'].get(path, {}).get(method.lower())
            if digest(operation) != expected:
                errors.append(f'Несовместимость extended operations: {name}')
            if path in legacy_bundle['paths']:
                legacy_bundle['paths'][path].pop(method.lower(), None)
                if not legacy_bundle['paths'][path]:
                    del legacy_bundle['paths'][path]
        for name, expected in extension['schemas'].items():
            actual = bundle['components']['schemas'].get(name)
            if digest(actual) != expected:
                errors.append(f'Несовместимость extended schemas: {name}')
            legacy_bundle['components']['schemas'].pop(name, None)
        legacy_bundle['tags'] = [tag for tag in legacy_bundle['tags']
                                 if tag['name'] not in extension['tags']]
        legacy_bundle['info'] = extension['legacy_info']
        extended_source = deepcopy(documents[EXTENDED])

        def restore_extended_location(value):
            if isinstance(value, list):
                return [restore_extended_location(item) for item in value]
            if not isinstance(value, dict):
                return value
            result = {key: restore_extended_location(item) for key, item in value.items()}
            reference = result.get('$ref', '')
            for current, original in (('./shared/common.yaml#', '../shared/common.yaml#'),
                                      ('./core.yaml#', '../core.yaml#')):
                if reference.startswith(current):
                    result['$ref'] = original + reference.split('#', 1)[1]
            return result

        extended_source = restore_extended_location(extended_source)
        extended_source['x-dependencies'] = [
            '../' + path[2:] if path.startswith('./') else path
            for path in extended_source.get('x-dependencies', [])]
        if digest(extended_source) != extension['document_sha256']:
            errors.append('Третья зона отличается от согласованной для интеграции поставки PROPOSED')
        if digest(bundle) != extension['specification_sha256']:
            errors.append('Общая спецификация отличается от снимка с третьей зоной')
        counts = {'operations': sum(m in METHODS for p in bundle['paths'].values() for m in p),
                  'paths': len(bundle['paths']), 'schemas': len(bundle['components']['schemas'])}
        if counts != extension['counts']:
            errors.append(f'Изменилось количество операций/маршрутов/схем extended: {counts}')
    elif documents[EXTENDED]['paths']:
        errors.append('Для непустой зоны 3 отсутствует отдельный снимок совместимости')
    bundle = legacy_bundle
    operations = {f'{method.upper()} {path}': digest(operation)
                  for path, item in bundle['paths'].items()
                  for method, operation in item.items() if method in METHODS}
    schemas = {name: digest(schema) for name, schema in bundle['components']['schemas'].items()}
    for label, actual in (('operations', operations), ('schemas', schemas)):
        expected = baseline[label]
        for name in sorted(set(actual) | set(expected)):
            if actual.get(name) != expected.get(name):
                errors.append(f'Несовместимость {label}: {name} добавлен, удалён или изменён')
    counts = {'operations': len(operations), 'paths': len(bundle['paths']), 'schemas': len(schemas)}
    if counts != baseline['counts']:
        errors.append(f'Изменилось количество операций/маршрутов/схем: {counts}')
    # Проверяет также описания, security, tags, servers и все неоперационные компоненты.
    if digest(bundle) != baseline['specification_sha256']:
        errors.append('Общая спецификация структурно отличается от исходного снимка')
    if digest(legacy_core_references(documents['core.yaml'])) != baseline['core_sha256']:
        errors.append('Основная зона структурно отличается от исходного снимка')
    for name, expected in baseline['protected_files'].items():
        if name == 'extended.yaml' and extension:
            # Разрешено только добавление зафиксированной выше поставки, старый снимок не меняется.
            continue
        relocated = {'common.yaml': COMMON, 'extended.yaml': EXTENDED}.get(name, name)
        content = (root / relocated).read_bytes()
        if name == 'foundation.yaml':
            # Сохраняет проверку всех прежних байтов, кроме нового адреса той же зависимости.
            content = content.replace(b'./shared/common.yaml#', b'./common.yaml#')
        if hashlib.sha256(content).hexdigest() != expected:
            errors.append(f'Защищённый файл изменён: {name}')
    return errors
