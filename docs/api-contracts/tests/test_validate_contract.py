"""Регрессии сборки: конфликты, потеря данных и ограничения nullable."""
from copy import deepcopy
import json
from pathlib import Path
import re
import tempfile
import sys
import unittest

from jsonschema import Draft4Validator
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))

from validate_contract import (
    ROOT, UniqueKeyLoader, build_contract, json_schema, load_documents, validate,
    build_core, build_index,
)
from contract_sources import check_module_graph, module_names, BASELINE, INDEX, EXTENDED, EXTENDED_BASELINE
from contract_compatibility import check_compatibility, legacy_core_references


class ContractValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.baseline = load_documents()

    def setUp(self):
        self.documents = deepcopy(self.baseline)

    def test_current_documents_are_synchronized(self):
        self.assertEqual(validate(self.documents), [])

    def test_root_keeps_four_canonical_yaml_files(self):
        self.assertEqual({p.name for p in ROOT.glob('*.yaml')},
                         {'foundation.yaml', 'core.yaml', 'extended.yaml', 'openapi.yaml'})

    def test_index_links_resolve_from_guide_directory(self):
        for target in re.findall(r'\]\(([^)]+)\)', build_index(self.documents)):
            if target.startswith('#'):
                continue  # Якоря дополнительно проверяет check_docs.
            self.assertTrue(((ROOT / INDEX).parent / target).is_file(), target)

    def test_relocation_normalization_only_changes_reference_values(self):
        value = {'$ref': './shared/common.yaml#/components/schemas/Error',
                 'description': './shared/common.yaml#/components/schemas/Error'}
        normalized = legacy_core_references(value)
        self.assertEqual(normalized['$ref'], './common.yaml#/components/schemas/Error')
        self.assertEqual(normalized['description'], value['description'])

    def test_yaml_duplicate_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Повторный YAML-ключ'):
            yaml.load('paths: {}\npaths: {}', Loader=UniqueKeyLoader)

    def test_same_operation_in_two_zones_is_rejected(self):
        self.documents['extended.yaml']['paths']['/api/news'] = deepcopy(
            self.documents['core.yaml']['paths']['/api/news'])
        with self.assertRaisesRegex(ValueError, 'Коллизия HTTP-операции'):
            build_contract(self.documents)

    def test_distinct_methods_on_shared_path_are_merged(self):
        self.documents['extended.yaml']['paths']['/api/news'] = {
            'head': {'operationId': 'headNews', 'responses': {'200': {'description': 'OK'}}}}
        self.assertEqual(set(build_contract(self.documents)['paths']['/api/news']), {'get', 'head'})

    def test_ambiguous_path_template_is_rejected(self):
        self.documents['extended.yaml']['paths']['/api/news/{otherId}'] = {
            'get': {'operationId': 'otherNews'}}
        with self.assertRaisesRegex(ValueError, 'Коллизия шаблонов'):
            build_contract(self.documents)

    def test_component_conflict_is_rejected(self):
        self.documents['core.yaml']['components']['schemas']['NewsPage'] = {'type': 'string'}
        with self.assertRaisesRegex(ValueError, 'Коллизия components.schemas'):
            build_contract(self.documents)

    def test_tag_conflict_is_rejected(self):
        self.documents['extended.yaml']['tags'] = [{'name': 'News', 'description': 'Different'}]
        with self.assertRaisesRegex(ValueError, 'Коллизия tags'):
            build_contract(self.documents)

    def test_operation_id_conflict_is_rejected(self):
        self.documents['core.yaml']['paths']['/api/news']['get']['operationId'] = 'getSession'
        with self.assertRaisesRegex(ValueError, 'Коллизия operationId'):
            build_contract(self.documents)

    def test_broken_external_reference_is_rejected(self):
        self.documents['core.yaml']['paths']['/api/news']['get']['parameters'][0]['$ref'] = (
            './shared/common.yaml#/components/parameters/Missing')
        self.assertTrue(any('Missing' in error for error in validate(self.documents)))

    def test_response_drift_is_detected_even_when_paths_and_methods_match(self):
        response = self.documents['openapi.yaml']['paths']['/api/news']['get']['responses']['200']
        response['content'] = {'application/json': {'schema': {'type': 'object'}}}
        self.assertTrue(any('отличается от сборки' in error for error in validate(self.documents)))

    def test_schema_and_tag_drift_are_detected(self):
        self.documents['openapi.yaml']['components']['schemas']['NewsPage']['required'] = []
        self.documents['openapi.yaml']['tags'] = []
        self.assertTrue(any('отличается от сборки' in error for error in validate(self.documents)))

    def test_security_alias_is_resolved_without_self_reference(self):
        bundle = build_contract(self.documents)
        scheme = bundle['components']['securitySchemes']['SessionCookie']
        self.assertNotIn('$ref', scheme)
        self.assertEqual(scheme, self.documents['shared/common.yaml']['components']['securitySchemes']['SessionCookie'])

    def test_alias_cycle_is_rejected(self):
        self.documents['core.yaml']['components']['schemas']['Cycle'] = {
            '$ref': '#/components/schemas/Cycle'}
        with self.assertRaisesRegex(ValueError, 'Цикл псевдонимов'):
            build_contract(self.documents)

    def test_nullable_reference_preserves_required_and_additional_properties(self):
        bundle = json_schema(build_contract(self.documents))
        field = bundle['components']['schemas']['NewsAdminRecord']['properties']['published']
        validator = Draft4Validator({'components': bundle['components'], **field})
        self.assertTrue(validator.is_valid(None))
        for invalid in ({}, {'unexpected': 1}, [], '', False, 0):
            self.assertFalse(validator.is_valid(invalid), repr(invalid))

    def test_nullable_primitive_keeps_length_and_enum_limits(self):
        schemas = self.documents['core.yaml']['components']['schemas']
        field = schemas['NewsDraftContent']['properties']['coverMediaId']
        validator = Draft4Validator(json_schema(field))
        for valid in (None, 'image-id'):
            self.assertTrue(validator.is_valid(valid))
        for invalid in ('', [], {}, 1, False):
            self.assertFalse(validator.is_valid(invalid))
        enum = Draft4Validator(json_schema(schemas['FaqAdminItem']['properties']['draftAction']))
        for valid in (None, 'upsert', 'delete'):
            self.assertTrue(enum.is_valid(valid))
        self.assertFalse(enum.is_valid('publish'))

    def test_nullable_pagination_keeps_minimum_and_integer(self):
        field = self.documents['core.yaml']['components']['schemas']['UpdatesPage']['properties']['nextPage']
        validator = Draft4Validator(json_schema(field))
        for valid in (None, 1, 2):
            self.assertTrue(validator.is_valid(valid))
        for invalid in (0, -1, 1.5, False, '2'):
            self.assertFalse(validator.is_valid(invalid))

    def test_permanent_delete_requires_true_boolean(self):
        schema = self.documents['core.yaml']['components']['schemas']['ConfirmPermanentDeletion']
        validator = Draft4Validator(json_schema(schema))
        self.assertTrue(validator.is_valid({'confirm': True}))
        for invalid in ({}, {'confirm': False}, {'confirm': 1}, {'confirm': 'true'}):
            self.assertFalse(validator.is_valid(invalid))

    def test_modular_core_matches_generated_core(self):
        self.assertEqual(build_core(self.documents), self.documents['core.yaml'])
        self.assertEqual(len(module_names(self.documents)), 12)

    def test_all_operations_and_schemas_match_original_snapshot(self):
        baseline = json.loads((ROOT / BASELINE).read_text(encoding='utf8'))
        self.documents['core.yaml'] = build_core(self.documents)
        self.documents['openapi.yaml'] = build_contract(self.documents)
        self.assertEqual(check_compatibility(self.documents, baseline), [])

    def test_semantic_drift_in_source_is_detected_after_rebuild(self):
        self.documents['core/news.yaml']['paths']['/api/news']['get']['security'] = [{'SessionCookie': []}]
        self.documents['core.yaml'] = build_core(self.documents)
        self.documents['openapi.yaml'] = build_contract(self.documents)
        baseline = json.loads((ROOT / BASELINE).read_text(encoding='utf8'))
        errors = check_compatibility(self.documents, baseline)
        self.assertTrue(any('GET /api/news' in error for error in errors))

    def test_module_operation_collision_is_rejected(self):
        self.documents['core/updates.yaml']['paths']['/api/news'] = deepcopy(
            self.documents['core/news.yaml']['paths']['/api/news'])
        with self.assertRaisesRegex(ValueError, 'Коллизия HTTP-операции в модулях'):
            build_core(self.documents)

    def test_module_component_collision_is_rejected_even_when_identical(self):
        self.documents['core/updates.yaml']['components']['schemas']['PublishedNews'] = deepcopy(
            self.documents['core/news.yaml']['components']['schemas']['PublishedNews'])
        with self.assertRaisesRegex(ValueError, 'Коллизия компонентов модулей'):
            build_core(self.documents)

    def test_module_operation_id_collision_is_rejected(self):
        self.documents['core/news.yaml']['paths']['/api/news']['get']['operationId'] = 'getPublicNews'
        with self.assertRaisesRegex(ValueError, 'Коллизия operationId в модулях'):
            build_core(self.documents)

    def test_cross_module_cycle_is_rejected(self):
        self.documents['core/news.yaml']['components']['schemas']['Link'] = {
            '$ref': './updates.yaml#/components/schemas/UpdateCard'}
        self.documents['core/updates.yaml']['components']['schemas']['BackLink'] = {
            '$ref': './news.yaml#/components/schemas/PublishedNews'}
        with self.assertRaisesRegex(ValueError, 'Циклическая зависимость модулей'):
            build_core(self.documents)

    def test_module_must_not_depend_on_generated_core(self):
        self.documents['core/news.yaml']['paths']['/api/news']['get']['parameters'][0]['$ref'] = (
            '../core.yaml#/components/schemas/PublishedNews')
        with self.assertRaisesRegex(ValueError, 'генерируемый или недопустимый источник'):
            build_core(self.documents)

    def test_broken_cross_module_reference_is_rejected(self):
        self.documents['core/news.yaml']['components']['schemas']['Missing'] = {
            '$ref': './updates.yaml#/components/schemas/DoesNotExist'}
        with self.assertRaises(KeyError):
            build_core(self.documents)

    def test_module_status_must_remain_proposed(self):
        self.documents['core/news.yaml']['x-stability'] = 'agreed'
        with self.assertRaisesRegex(ValueError, 'PROPOSED'):
            build_core(self.documents)

    def test_transport_reuse_is_expanded_without_adding_schemas(self):
        shared = self.documents['core/shared.yaml']['components']
        original = self.documents['core.yaml']
        built = build_core(self.documents)
        self.assertEqual(shared['parameters']['IfMatch']['name'], 'If-Match')
        self.assertIn('EditingETag', shared['headers'])
        self.assertNotIn('headers', built['components'])
        self.assertNotIn('parameters', built['components'])
        self.assertEqual(built, original)
        self.assertEqual(check_module_graph(self.documents)['core/shared.yaml'], set())

    def test_generated_index_contains_all_operations_and_correct_sources(self):
        index = build_index(self.documents)
        self.assertEqual(sum(line.startswith(('| GET |', '| POST |', '| PUT |', '| PATCH |', '| DELETE |'))
                             for line in index.splitlines()), 119)
        self.assertIn('| GET | `/api/news` | `listPublicNews` | [core/news.yaml]', index)
        self.assertIn('| POST | `/api/cms/news` |', index)

    def test_loader_can_rebuild_when_generated_files_are_missing(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name, data in self.documents.items():
                if name in ('core.yaml', 'openapi.yaml'):
                    continue
                target = root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(yaml.safe_dump(data, allow_unicode=True), encoding='utf8')
            loaded = load_documents(root, allow_missing_generated=True)
            self.assertEqual(build_core(loaded), self.documents['core.yaml'])
            (root / 'core.yaml').write_text('broken: [', encoding='utf8')
            (root / 'openapi.yaml').write_text('broken: [', encoding='utf8')
            loaded = load_documents(root, allow_missing_generated=True)
            self.assertEqual(build_core(loaded), self.documents['core.yaml'])
            (root / 'core/orphan.yaml').write_text('paths: {}', encoding='utf8')
            with self.assertRaisesRegex(ValueError, 'Незарегистрированные'):
                load_documents(root, allow_missing_generated=True)

    def test_three_zone_totals(self):
        bundle = build_contract(self.documents)
        self.assertEqual(len(bundle['paths']), 102)
        self.assertEqual(sum(len(item) for item in bundle['paths'].values()), 119)
        self.assertEqual(len(bundle['components']['schemas']), 115)
        self.assertEqual(len(self.documents[EXTENDED]['components']['schemas']), 18)

    def test_world_machine_only_exposes_text_and_supports_conditional_get(self):
        extended = self.documents[EXTENDED]
        schema = extended['components']['schemas']['WorldMachineTextContent']
        validator = Draft4Validator(json_schema(schema))
        self.assertTrue(validator.is_valid({'title': 'Title', 'bodyMarkdown': 'Text'}))
        for field in ('coordinates', 'nodes', 'edges', 'space', 'layout', 'animation', 'zoom', 'linksToNodes'):
            self.assertFalse(validator.is_valid({'title': 'Title', 'bodyMarkdown': 'Text', field: []}))
        operation = extended['paths']['/api/world-machine/texts']['get']
        self.assertEqual(operation['security'], [])
        for code in ('200', '304'):
            self.assertIn('ETag', operation['responses'][code]['headers'])
        self.assertNotIn('content', operation['responses']['304'])
        self.assertNotIn('post', extended['paths']['/api/cms/world-machine/texts'])
        self.assertNotIn('delete', extended['paths']['/api/cms/world-machine/texts/{textKey}'])

    def test_batch_publication_requires_idempotency_key(self):
        paths = self.documents[EXTENDED]['paths']
        publish = paths['/api/cms/publication-batches/publish']['post']
        header = next(p for p in publish['parameters'] if p.get('name') == 'Idempotency-Key')
        self.assertTrue(header['required'])
        validator = Draft4Validator(header['schema'])
        self.assertTrue(validator.is_valid('x' * 16))
        self.assertFalse(validator.is_valid('x' * 15))
        self.assertFalse(validator.is_valid('x' * 129))
        self.assertFalse(any(p.get('name') == 'Idempotency-Key' for p in
                             paths['/api/cms/publication-batches/validate']['post']['parameters']))

    def test_batch_does_not_accept_news_or_updates(self):
        schema = self.documents[EXTENDED]['components']['schemas']['PublicationBatchItem']
        validator = Draft4Validator(schema)
        self.assertTrue(validator.is_valid({'type': 'presskit', 'resourceKey': 'presskit', 'expectedEditVersion': 1}))
        for resource in ('news', 'update'):
            self.assertFalse(validator.is_valid({'type': resource, 'resourceKey': 'id', 'expectedEditVersion': 1}))

    def test_presskit_archive_is_public_binary_zip(self):
        operation = self.documents[EXTENDED]['paths']['/api/presskit/archive/{snapshotId}']['get']
        self.assertEqual(operation['security'], [])
        self.assertEqual(operation['responses']['200']['content'],
                         {'application/zip': {'schema': {'type': 'string', 'format': 'binary'}}})
        self.assertIn('Content-Disposition', operation['responses']['200']['headers'])
        preview = self.documents[EXTENDED]['paths']['/api/cms/presskit/archive/preview-manifest']['get']
        self.assertEqual(preview['responses']['200']['headers']['Cache-Control']['schema']['enum'], ['no-store'])

    def test_diff_before_after_allow_null_but_not_numbers_or_objects(self):
        schema = self.documents[EXTENDED]['components']['schemas']['FieldChange']
        validator = Draft4Validator(json_schema(schema))
        self.assertTrue(validator.is_valid({'path': 'title', 'kind': 'added', 'before': None, 'after': 'Title'}))
        for value in (1, {}, []):
            self.assertFalse(validator.is_valid({'path': 'title', 'kind': 'modified', 'before': value, 'after': None}))

    def test_removing_extended_zone_is_not_hidden_by_legacy_projection(self):
        self.documents[EXTENDED]['paths'] = {}
        self.documents['openapi.yaml'] = build_contract(self.documents)
        baseline = json.loads((ROOT / BASELINE).read_text(encoding='utf8'))
        self.assertTrue(check_compatibility(self.documents, baseline))

    def test_extended_schema_drift_is_detected_after_rebuild(self):
        self.documents[EXTENDED]['components']['schemas']['WorldMachineTextContent']['required'] = []
        self.documents['openapi.yaml'] = build_contract(self.documents)
        baseline = json.loads((ROOT / BASELINE).read_text(encoding='utf8'))
        errors = check_compatibility(self.documents, baseline)
        self.assertTrue(any('WorldMachineTextContent' in error for error in errors))


if __name__ == '__main__':
    unittest.main()
