#!/usr/bin/env python3
"""Локальная структурная проверка ZaryaWebsite OpenAPI 0.1; не заменяет OpenAPI schema validator."""
from collections import Counter
from pathlib import Path
from urllib.parse import unquote
import yaml
from jsonschema import Draft202012Validator

ROOT=Path(__file__).resolve().parent
FILES=['common.yaml','foundation.yaml','core.yaml','extended.yaml','openapi.yaml']
DOC={name:yaml.safe_load((ROOT/name).read_text(encoding='utf8')) for name in FILES}
errors=[]

def err(msg):errors.append(msg)

def pointer(document,p):
 if not p.startswith('#/'):
  raise ValueError(f'Неверный указатель {p}')
 x=document
 for part in p[2:].split('/'):
  part=part.replace('~1','/').replace('~0','~')
  if not isinstance(x,dict) or part not in x:
   raise KeyError(f'Не найдено {p}, часть {part}')
  x=x[part]
 return x

def inspect_refs(item,fromfile,trail='root'):
 if isinstance(item,dict):
  if '$ref' in item:
   r=item['$ref']
   try:
    if r.startswith('#/'):
     target=pointer(DOC[fromfile],r)
    elif '#/' in r:
     name,ptr=r.split('#',1)
     name=name.removeprefix('./')
     if name not in DOC: raise KeyError(f'Неизвестный файл {name}')
     target=pointer(DOC[name],'#'+ptr)
    else: raise ValueError(f'Неподдерживаемая ссылка {r}')
    if not isinstance(target,dict):raise TypeError('Ссылка не объект')
   except Exception as e:err(f'{fromfile} {trail}: {r} — {e}')
  for k,v in item.items(): inspect_refs(v,fromfile,f'{trail}.{k}')
 elif isinstance(item,list):
  for i,v in enumerate(item):inspect_refs(v,fromfile,f'{trail}[{i}]')

for filename,data in DOC.items():
 if data.get('openapi')!='3.1.0':err(f'{filename}: ожидаем OpenAPI 3.1.0')
 if not isinstance(data.get('info'),dict) or not isinstance(data.get('paths'),dict):err(f'{filename}: некорректная оболочка')
 inspect_refs(data,filename)

methods={'get','post','put','patch','delete','options','head','trace'}
ids=[]
for filename in ('foundation.yaml','core.yaml','extended.yaml'):
 for path,item in DOC[filename]['paths'].items():
  if not path.startswith('/api/'):err(f'{filename}: путь без /api/: {path}')
  for method,operation in item.items():
   if method not in methods:continue
   oid=operation.get('operationId')
   if not oid:err(f'{filename} {path} {method}: нет operationId')
   ids.append(oid)
   responses=operation.get('responses',{})
   if not any(k[0]=='2' for k in responses if k.isdigit()):err(f'{oid}: нет успешного ответа')
   if method in {'post','put','patch','delete'}:
    refs=[p.get('$ref','') for p in operation.get('parameters',[]) if isinstance(p,dict)]
    if './common.yaml#/components/parameters/CsrfHeader' not in refs:
     err(f'{oid}: отсутствует CSRF-header')
   if filename=='foundation.yaml' and operation.get('x-contract-zone')!='foundation':err(f'{oid}: нет метки зоны')
   if filename=='core.yaml' and operation.get('x-contract-zone')!='core':err(f'{oid}: нет метки зоны')

for opid,n in Counter(ids).items():
 if n!=1:err(f'Дублирующийся operationId: {opid}')

expected={**DOC['foundation.yaml']['paths'],**DOC['core.yaml']['paths'],**DOC['extended.yaml']['paths']}
if set(DOC['openapi.yaml']['paths'])!=set(expected):err('Единый openapi.yaml не совпадает с набором путей')
for p in expected:
 if set(DOC['openapi.yaml']['paths'][p])!=set(expected[p]):err(f'Методы объединения не совпадают: {p}')

common=DOC['common.yaml']['components']['schemas']
for schema_name,schema in common.items():
 try:Draft202012Validator.check_schema(schema)
 except Exception as e:err(f'Некорректная JSON Schema {schema_name}: {e}')
if common['RegisterRequest']['required'] != ['username','displayName','email','password']:err('Регистрация: требуется username, displayName, email, password')
if 'owner' in common['RoleChangeRequest']['properties']['role']['enum']:err('Роль owner назначается исключительно через transfer')
if set(common['NewsCard']['required']) != {'id','title','summary','coverUrl','publishedAt'}:err('NewsCard несовместима с frontend/MSW')
if DOC['extended.yaml']['paths']:err('Расширенная зона пока должна быть без фиктивных методов')
for val in DOC['openapi.yaml']['paths'].values():
 for op in val.values():
  if op.get('operationId') not in ids:err('Единый файл содержит неизвестную операцию')

if errors:
 print('НЕ ПРОЙДЕНО:')
 for issue in errors:print(' •',issue)
 raise SystemExit(1)
print('OK: 5 YAML файлов, все $ref разрешимы, обязательные поля и зоны проверены.')
print(f'Зона 1: {sum(len(p) for p in DOC["foundation.yaml"]["paths"].values())} операций, '
      f'зона 2: {sum(len(p) for p in DOC["core.yaml"]["paths"].values())}, зона 3: 0.')
print('ОГРАНИЧЕНИЕ: структурная проверка не заменяет формальную OAS Schema Validation или тесты backend.')
