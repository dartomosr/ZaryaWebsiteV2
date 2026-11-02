"""Явная фиксация разрешённой редакции после ревью; сборщик её не вызывает."""
import argparse
from copy import deepcopy
import hashlib
import json
from contract_sources import ROOT, METHODS, load_documents, build_core, build_contract
from contract_compatibility import digest
from validate_contract import validate


def reconstruct_original(bundle, changes):
    original = deepcopy(bundle)
    for change in reversed(changes):
        keys = [k.replace('~1', '/').replace('~0', '~') for k in change['path'][1:].split('/')]
        target = original
        for key in keys[:-1]:
            target = target[key]
        if change['kind'] == 'added':
            if target.pop(keys[-1]) != change['after']:
                raise ValueError('Исходная сборка отличается от сохранённого diff')
        elif change['kind'] == 'removed':
            target[keys[-1]] = change['before']
        else:
            if target[keys[-1]] != change['after']:
                raise ValueError('Исходная сборка отличается от сохранённого diff')
            target[keys[-1]] = change['before']
    return original


def diff(before, after, path=''):
    if before == after:
        return []
    if isinstance(before, dict) and isinstance(after, dict):
        changes = []
        for key in sorted(before.keys() | after.keys()):
            child = path + '/' + key.replace('~', '~0').replace('/', '~1')
            if key not in before:
                changes.append({'path': child, 'kind': 'added', 'after': after[key]})
            elif key not in after:
                changes.append({'path': child, 'kind': 'removed', 'before': before[key]})
            else:
                changes.extend(diff(before[key], after[key], child))
        return changes
    return [{'path': path, 'kind': 'changed', 'before': before, 'after': after}]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reason', required=True, help='Основание разрешённого изменения после ревью')
    args = parser.parse_args()
    if not args.reason.strip():
        parser.error('Нужно непустое основание изменения')
    baseline_path = ROOT / 'tests/fixtures/audit-baseline.json'
    diff_path = ROOT / 'tests/fixtures/audit-changes.json'
    previous = json.loads(baseline_path.read_text(encoding='utf8'))
    for name, expected in previous['historical_files'].items():
        if hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != expected:
            raise ValueError(f'Исторический снимок изменён: {name}')
    documents = load_documents()
    original = reconstruct_original(documents['openapi.yaml'], json.loads(diff_path.read_text(encoding='utf8'))['changes'])
    legacy = json.loads((ROOT/'tests/fixtures/extended-baseline.json').read_text(encoding='utf8'))
    if digest(original) != legacy['specification_sha256']:
        raise ValueError('Diff не восстанавливает исторический снимок 0.3')
    documents['core.yaml'] = build_core(documents)
    documents['openapi.yaml'] = build_contract(documents)
    errors = validate(documents, json.loads((ROOT/'tests/fixtures/oas30.schema.json').read_text(encoding='utf8')))
    if errors:
        raise ValueError('\n'.join(errors))
    bundle = documents['openapi.yaml']
    snapshot = {
        'version': bundle['info']['version'], 'authorization': args.reason,
        'documents': {n: digest(v) for n,v in documents.items()},
        'operations': {f'{m.upper()} {p}': digest(op) for p,item in bundle['paths'].items()
                       for m,op in item.items() if m in METHODS},
        'schemas': {n: digest(s) for n,s in bundle['components']['schemas'].items()},
        'historical_files': previous['historical_files'],
    }
    changes = {'beforeVersion': original['info']['version'], 'afterVersion': bundle['info']['version'],
               'changes': diff(original, bundle)}
    for path, value in [(baseline_path, snapshot), (diff_path, changes)]:
        path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(f'Снимок обновлён явно: {len(changes["changes"])} различий. Далее validate_contract.py --write.')


if __name__ == '__main__':
    main()
