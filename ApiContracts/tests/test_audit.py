import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import yaml
from jsonschema import Draft4Validator, FormatChecker

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from contract_sources import ROOT, build_contract, build_core, load_documents, METHODS
from contract_rules import check_rules
from validate_contract import json_schema
from check_docs import check_examples, check_links, http_requests
from contract_formats import FORMAT_CHECKER


class AuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.documents = load_documents()
        cls.bundle = cls.documents['openapi.yaml']

    def validator(self, name):
        bundle = json_schema(self.bundle)
        return Draft4Validator({'components': bundle['components'], '$ref': '#/components/schemas/' + name}, format_checker=FORMAT_CHECKER)

    def test_r04_username_namespace_and_case_insensitive_identity_contract(self):
        schemas = self.bundle['components']['schemas']
        for name in ('RegisterRequest', 'UserProfile', 'UserDirectoryEntry'):
            schema = schemas[name]['properties']['username']
            validator = Draft4Validator(schema)
            for value in ('example_reader', 'EXAMPLE_READER'):
                self.assertTrue(validator.is_valid(value), name)
            for value in ('reader@example.test', 'ab', 'x' * 31):
                self.assertFalse(validator.is_valid(value), name)
            # Уникальность между аккаунтами не выражается JSON Schema:
            # проверяем нормативное правило контракта, не имитируем сервер/SQL.
            self.assertIn('без учёта регистра ASCII', schema['description'])
        registration = schemas['RegisterRequest']['description']
        self.assertIn('409', registration)
        self.assertIn('атомарно', registration)

    def test_r04_login_reuses_one_field_without_bypassing_email_or_two_factor(self):
        schemas = self.bundle['components']['schemas']
        self.assertEqual(set(schemas['LoginRequest']['properties']), {'login', 'password'})
        for login in ('EXAMPLE_READER', 'reader@example.test'):
            self.assertTrue(self.validator('LoginRequest').is_valid({'login':login,'password':'Example-only-9'}))
        self.assertFalse(self.validator('LoginRequest').is_valid({'displayName':'Читатель','password':'Example-only-9'}))
        rule = schemas['LoginRequest']['properties']['login']['description']
        self.assertIn('Если содержит @, искать только по email', rule)
        self.assertIn('иначе только по username', rule)
        self.assertIn('Не использовать displayName', rule)
        self.assertEqual(set(schemas['DisplayNamePatch']['properties']), {'displayName'})
        operation = self.bundle['paths']['/api/auth/login']['post']
        self.assertIn('email_verification_required', operation['description'])
        self.assertIn('Пароль не означает прохождение 2FA', operation['description'])

    def test_r04_owner_transfer_roles_and_existing_proof(self):
        schema = self.bundle['components']['schemas']['OwnerTransferRequest']
        self.assertEqual(set(schema['properties']), {'targetUserId','password','totpCode'})
        body = {'targetUserId':'next-owner','password':'Example-only-9','totpCode':'123456'}
        self.assertTrue(self.validator('OwnerTransferRequest').is_valid(body))
        for missing in ('password','totpCode'):
            self.assertFalse(self.validator('OwnerTransferRequest').is_valid({k:v for k,v in body.items() if k != missing}))
        self.assertFalse(self.validator('RoleChangeRequest').is_valid({'role':'owner'}))
        operation = self.bundle['paths']['/api/owner/transfer']['post']
        self.assertEqual(operation['x-permitted-roles'], ['owner'])
        self.assertEqual(operation['x-required-auth-states'], ['active'])
        self.assertEqual(operation['security'], [{'SessionCookie':[]}])
        for requirement in ('целевой аккаунт получает owner', 'прежний владелец получает user',
                            'независимо от прежних административных полномочий', 'ровно один Owner',
                            'частичная смена ролей невозможна', 'сессии отзываются'):
            self.assertIn(requirement, operation['description'])
        self.assertIn('204', operation['responses'])

    def test_partial_first_world_preview_is_representable(self):
        preview = {'items': [{'key': 'first', 'title': ''}, {'key': 'second'}]}
        self.assertTrue(self.validator('WorldMachinePreviewBundle').is_valid(preview))
        self.assertFalse(self.validator('WorldMachineTextBundle').is_valid({'contentGeneration':'1', **preview}))

    def test_staff_recovery_can_transmit_proof_without_changing_password_recovery(self):
        body = {'userEmailOwnershipVerified': True, 'proof': {'method':'totp','code':'123456'}}
        self.assertTrue(self.validator('AssistedRecoveryStart').is_valid(body))
        self.assertFalse(self.validator('PasswordRecoveryStart').is_valid(body))
        body['proof']['method'] = 'password'
        self.assertFalse(self.validator('AssistedRecoveryStart').is_valid(body))

    def test_publish_modes_enforce_null_and_date(self):
        v = self.validator('PublishRequest')
        for valid in ({'mode':'now','scheduledAt':None}, {'mode':'schedule','scheduledAt':'2026-11-03T12:00:00Z'}):
            self.assertTrue(v.is_valid(valid), valid)
        for invalid in ({'mode':'schedule','scheduledAt':None}, {'mode':'now','scheduledAt':'2026-11-03T12:00:00Z'}, {'mode':'schedule','scheduledAt':'not-a-date'}):
            self.assertFalse(v.is_valid(invalid), invalid)

    def test_comment_parent_pair_and_nonblank_text(self):
        v = self.validator('NewComment')
        self.assertTrue(v.is_valid({'text':'Example','rootId':None,'replyToCommentId':None}))
        self.assertTrue(v.is_valid({'text':'Example','rootId':'r1','replyToCommentId':'r2'}))
        for body in ({'text':' ','rootId':None,'replyToCommentId':None}, {'text':'Example','rootId':'r1','replyToCommentId':None}):
            self.assertFalse(v.is_valid(body))

    def test_singleton_batch_keys_and_duplicate_items(self):
        v = self.validator('PublicationBatchItem')
        for kind, key in [('presskit','presskit'), ('gameSummary','game-summary'), ('faqOrder','faq-order')]:
            self.assertTrue(v.is_valid({'type':kind,'resourceKey':key,'expectedEditVersion':1}))
            self.assertFalse(v.is_valid({'type':kind,'resourceKey':'wrong','expectedEditVersion':1}))
        item = {'type':'presskit','resourceKey':'presskit','expectedEditVersion':1}
        self.assertFalse(self.validator('PublicationBatchRequest').is_valid({'items':[item,item]}))

    def test_faq_order_rejects_duplicates(self):
        self.assertFalse(self.validator('FaqOrderDraft').is_valid({'itemIds':['a','a']}))

    def test_media_references_represent_history_and_untitled_drafts(self):
        for scope in ('draft','revision','archive'):
            self.assertTrue(self.validator('MediaReference').is_valid({'kind':'news','resourceId':'n1','scope':scope,'title':''}))

    def test_security_rules_detect_removed_cache_policy(self):
        b=copy.deepcopy(self.bundle)
        del b['paths']['/api/auth/session']['get']['responses']['200']['headers']['Cache-Control']
        self.assertTrue(any('кеширование' in x for x in check_rules(b)))

    def test_rules_detect_missing_csrf_failure(self):
        b=copy.deepcopy(self.bundle)
        del b['paths']['/api/auth/register']['post']['responses']['403']
        self.assertTrue(any('CSRF 403' in x for x in check_rules(b)))

    def test_rules_detect_cms_anonymous_or_wrong_role(self):
        for key,value in [('security',[]),('x-permitted-roles',['moderator'])]:
            b=copy.deepcopy(self.bundle); b['paths']['/api/cms/news']['get'][key]=value
            self.assertTrue(any('права служебного' in x for x in check_rules(b)))

    def test_rules_detect_duplicate_header_case_insensitively(self):
        b=copy.deepcopy(self.bundle)
        p=b['paths']['/api/cms/news/{newsId}/draft']['put']['parameters']
        p.append({'name':'if-match','in':'header','schema':{'type':'string'}})
        self.assertTrue(any('повтор параметра' in x for x in check_rules(b)))

    def test_rules_detect_invalid_no_body_status(self):
        b=copy.deepcopy(self.bundle)
        b['paths']['/api/auth/logout']['post']['responses']['204']['content']={'application/json':{'schema':{'type':'object'}}}
        self.assertTrue(any('не может содержать' in x for x in check_rules(b)))

    def test_rules_detect_undefined_required_property(self):
        b=copy.deepcopy(self.bundle)
        b['components']['schemas']['LoginRequest']['required'].append('absent')
        self.assertTrue(any('required вне properties' in x for x in check_rules(b)))

    def test_rules_detect_case_insensitive_route_collision(self):
        b=copy.deepcopy(self.bundle); b['paths']['/API/NEWS']={}
        self.assertTrue(any('ASP.NET' in x for x in check_rules(b)))

    def test_if_match_requires_missing_stale_and_malformed_responses(self):
        b=copy.deepcopy(self.bundle)
        del b['paths']['/api/cms/news/{newsId}/draft']['put']['responses']['428']
        self.assertTrue(any('400/412/428' in x for x in check_rules(b)))

    def test_documentation_examples(self):
        errors, count=check_examples(self.bundle)
        self.assertGreaterEqual(count,40)
        self.assertEqual(errors,[])

    def test_documentation_links(self):
        self.assertEqual(check_links(),[])

    def test_http_requests_match_checked_examples(self):
        self.assertEqual((ROOT/'guides/EXAMPLES.http').read_text(encoding='utf8'),http_requests())

    def test_example_checker_rejects_unknown_body_field_and_missing_csrf(self):
        original=(ROOT/'guides/EXAMPLES.md').read_text(encoding='utf8')
        for invalid in (original.replace('"username": "example_reader",','"unexpected": true, "username": "example_reader",',1),
                        original.replace('X-CSRF-Token: example-csrf-current\n','',1)):
            with tempfile.TemporaryDirectory() as directory:
                file=Path(directory)/'examples.md'; file.write_text(invalid,encoding='utf8')
                self.assertTrue(check_examples(self.bundle,file)[0])

    def test_dates_checked_without_optional_jsonschema_dependencies(self):
        for value in ['not-a-date','2026-02-30T12:00:00Z','2026-11-02T12:00:00+00:99']:
            self.assertFalse(FORMAT_CHECKER.conforms(value,'date-time'))
        self.assertTrue(FORMAT_CHECKER.conforms('2026-11-02T12:00:00Z','date-time'))

    def test_generated_yaml_is_byte_reproducible(self):
        # Реальная CLI-сборка в изолированной копии; исходная рабочая копия не меняется.
        import shutil
        with tempfile.TemporaryDirectory() as directory:
            target=Path(directory)/'contracts'
            shutil.copytree(ROOT,target,ignore=shutil.ignore_patterns('__pycache__'))
            command=[sys.executable,'-B',str(target/'tools/validate_contract.py'),'--write']
            first=subprocess.run(command,capture_output=True,text=True)
            self.assertEqual(first.returncode,0,first.stdout+first.stderr)
            names=['core.yaml','openapi.yaml','guides/API_INDEX.md']
            outputs={n:(target/n).read_bytes() for n in names}
            second=subprocess.run(command,capture_output=True,text=True)
            self.assertEqual(second.returncode,0,second.stdout+second.stderr)
            self.assertEqual(outputs,{n:(target/n).read_bytes() for n in names})

    def test_explicit_baseline_update_validates_before_writing(self):
        import shutil
        with tempfile.TemporaryDirectory() as directory:
            target=Path(directory)/'contracts'
            shutil.copytree(ROOT,target,ignore=shutil.ignore_patterns('__pycache__','node_modules'))
            command=[sys.executable,'-B',str(target/'tools/update_baseline.py'),'--reason','Regression test']
            result=subprocess.run(command,capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stdout+result.stderr)
            snapshot=target/'tests/fixtures/audit-baseline.json'
            expected=snapshot.read_bytes()
            source=target/'core/news.yaml'
            document=yaml.safe_load(source.read_text(encoding='utf8'))
            document['paths']['/api/news']['get']['responses']['200']['content']={'application/json':{'schema':{'type':'object'}}}
            source.write_text(yaml.safe_dump(document,allow_unicode=True),encoding='utf8')
            result=subprocess.run(command,capture_output=True,text=True)
            self.assertNotEqual(result.returncode,0)
            self.assertEqual(snapshot.read_bytes(),expected)

    def test_exact_change_record_reconstructs_previous_bundle(self):
        # Diff обратим; прежний полный хеш берётся из неизменённого снимка 0.3.
        from contract_compatibility import digest
        b=copy.deepcopy(self.bundle)
        changes=json.loads((ROOT/'tests/fixtures/audit-changes.json').read_text(encoding='utf8'))['changes']
        for change in reversed(changes):
            keys=[k.replace('~1','/').replace('~0','~') for k in change['path'][1:].split('/')]
            target=b
            for k in keys[:-1]: target=target[k]
            if change['kind']=='added':
                self.assertEqual(target.pop(keys[-1]),change['after'])
            elif change['kind']=='removed': target[keys[-1]]=change['before']
            else:
                self.assertEqual(target[keys[-1]],change['after']); target[keys[-1]]=change['before']
        old=json.loads((ROOT/'tests/fixtures/extended-baseline.json').read_text(encoding='utf8'))
        self.assertEqual(digest(b),old['specification_sha256'])
        current=self.bundle
        self.assertTrue(set(b['paths']).issubset(current['paths']))
        for path,item in b['paths'].items():
            self.assertEqual(set(item),set(current['paths'][path]))
            for method,op in item.items():
                for key in ('security','x-permitted-roles','x-required-auth-states'):
                    self.assertEqual(op.get(key),current['paths'][path][method].get(key))
        self.assertEqual(b['components']['schemas']['PublishedNews'],
                         current['components']['schemas']['PublishedNews'])


if __name__=='__main__': unittest.main()
