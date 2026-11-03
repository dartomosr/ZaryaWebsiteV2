# API ZaryaWebsite

Контракт описывает единый HTTP API публичного сайта, CMS и модерации. Frontend использует его для API-адаптеров, backend для реализации ASP.NET Core, тестировщик для приёмки. YAML не создаёт работающий сервер.

**Редакция 0.5.0-proposed, 03.11.2026.** Все 119 операций пока `proposed`. Контракт `GET /api/news` обновлён по объявленному DTO Backend: JSON-массив, `url` описан как объект `PhysicalFileResult`, `contentType` допускает `image/jpeg`, `image/png` и `image/webp`. Это не строковая публичная ссылка. Фактическая сериализация DTO требует исправления/проверки; существующий frontend/MSW всё ещё ожидает multipart.

## С чего начать

Frontend-разработчику: [архитектура](guides/ARCHITECTURE.md), руководство нужной области, [HTTP-примеры](guides/EXAMPLES.md). Формат ответа Backend для списка новостей описан в [руководстве по новостям](guides/NEWS_RESPONSE.md); совместимость текущего клиента требует отдельной задачи.

Backend-разработчику: [источники и открытые решения](guides/ZONES_AND_DECISIONS.md), [безопасность](guides/SECURITY.md), [отчёт аудита](API_AUDIT_REPORT.md), затем Swagger и исходник модуля. В репозитории есть каркас .NET 10 без прикладных контроллеров, EF-моделей и SQL.

## Оглавление

| Документ | Содержание |
|---|---|
| [Архитектура](guides/ARCHITECTURE.md) | HTTP, DTO, ошибки, версии, пагинация, расширение |
| [Авторизация](guides/FOUNDATION_GUIDE.md) | Регистрация, 2FA, профиль, роли, восстановление |
| [Публикации и CMS](guides/CONTENT.md) | Черновики, расписание, история и корзина |
| [Общение и модерация](guides/COMMUNITY.md) | Комментарии, реакции, баны и стирание текста |
| [Информационные материалы](guides/INFORMATION.md) | FAQ, PressKit, описание игры, медиа |
| [Расширенные сценарии](guides/EXTENDED_GUIDE.md) | Мировая Машина, пакеты, ZIP, сравнение редакций |
| [Безопасность](guides/SECURITY.md) | Серверные проверки и устойчивость |
| [Новости](guides/NEWS_RESPONSE.md) | JSON DTO, сериализованный PhysicalFileResult и MIME обложки |
| [Старый multipart-клиент](guides/MULTIPART_NEWS.md) | Исторические детали парсера Frontend; не контракт Backend |
| [HTTP-примеры](guides/EXAMPLES.md) | Последовательности запросов и полные JSON-ответы |
| [Индекс операций](guides/API_INDEX.md) | Поиск endpoint и редактируемого YAML |
| [Источники и решения](guides/ZONES_AND_DECISIONS.md) | Требования, предложения и вопросы согласования |
| [История изменений](guides/CHANGELOG.md) | Редакции контракта |
| [Аудит](API_AUDIT_REPORT.md) | Дефекты, исправления, риски и проверки |

## Три зоны

| Зона | Назначение | Операции / маршруты | После согласования |
|---|---|---|---|
| Foundation | Сессии, аккаунты, роли, восстановление | 33 / 30 | Максимально стабильна |
| Core | CMS, публикации, общение, материалы | 73 / 60 | Изменения согласуются с потребителями |
| Extended | Мировая Машина, пакеты, архивы, сравнение | 13 / 12 | Допускает развитие отдельных модулей |

Это части одного API, а не три сервера или уровня обязательности функций. Название Foundation не означает утверждение. `x-contract-zone` и `x-stability` каждой операции показывают зону и статус. Реализацию подтверждают отдельно, с датой, средой и результатом интеграции.

## Источники и сборки

Редактируются [foundation.yaml](foundation.yaml), [shared/common.yaml](shared/common.yaml), модули [Core](guides/API_INDEX.md#core), [core/manifest.yaml](core/manifest.yaml) и [extended.yaml](extended.yaml). Общие CMS-схемы находятся в [core/shared.yaml](core/shared.yaml). Extended использует исходники, не сгенерированный Core.

**Не редактировать вручную:** [core.yaml](core.yaml), [openapi.yaml](openapi.yaml), [API_INDEX.md](guides/API_INDEX.md). Канонический файл для Swagger и передачи другой команде: `openapi.yaml`, 119 операций, 102 маршрута, 115 схем. Extended пока один исходник, его отдельная генерация не нужна.

## Изменение и проверки

Из корня репозитория в PowerShell, с существующим `.venv` (Python, PyYAML, jsonschema):

```powershell
.\.venv\Scripts\python.exe -B docs/api-contracts/tools/validate_contract.py --write
.\.venv\Scripts\python.exe -B docs/api-contracts/tools/validate_contract.py
.\.venv\Scripts\python.exe -B -m unittest discover -s docs/api-contracts/tests -p 'test_*.py' -v
.\.venv\Scripts\python.exe -B docs/api-contracts/tools/check_docs.py
node Frontend/node_modules/vitest/vitest.mjs run --config docs/api-contracts/tools/vitest.config.mjs
```

1. Найдите endpoint в индексе и измените исходник. Новый Core-модуль зарегистрируйте в manifest.
2. Проверьте совместимость, роли, состояния, примеры и руководство области.
3. После ревью разрешённого изменения осознанно обновите текущий [снимок аудита](tests/fixtures/audit-baseline.json). Генератор не обновляет снимки автоматически; пока снимок не отражает разрешённые изменения, `--write` завершится ошибкой без записи. Снимок фиксирует структуру, а не согласование backend.
4. Выполните команды выше. Официальная [JSON Schema OAS 3.0](https://spec.openapis.org/oas/3.0/schema/2024-10-18) сохранена локально в [oas30.schema.json](tests/fixtures/oas30.schema.json) и применяется по умолчанию, без интернета.
5. Зафиксируйте изменение и статус согласования в CHANGELOG. Backend, SQL и frontend меняются только в отдельно разрешённых задачах.

Исторические снимки 0.2/0.3 не изменены. [Сравнение 0.3 → 0.4](tests/fixtures/audit-changes.json) содержит JSON-пути и значения до/после. `--compare-to <путь>` проверяет полное структурное равенство с другим YAML; намеренные различия тоже дают ненулевой код. Воспроизводимость проверяется тестами.

Для явной фиксации разрешённого изменения после ревью выполните `python tools/update_baseline.py --reason "Основание изменения"` из каталога контрактов, используя Python проекта. Затем запустите штатный `--write`. Утилита проверяет OAS и правила, сохраняет исторические снимки, обновляет точное сравнение. Не используйте её для сокрытия неожиданного падения тестов.

HTTP-примеры редактируются в [EXAMPLES.md](guides/EXAMPLES.md); [EXAMPLES.http](guides/EXAMPLES.http) генерируется командой `check_docs.py --write-http` для Visual Studio/REST Client. Обычный `check_docs.py` проверяет отсутствие расхождений.

Проверки клиента: из `Frontend` выполнить `npm.cmd run check` (ESLint, CheckJS, Vitest, сборки). Это не проверка серверной реализации 119 методов.

## Просмотр в браузере и Visual Studio

```powershell
.\.venv\Scripts\python.exe -B docs/api-contracts/tools/serve_docs.py
```

Откройте <http://127.0.0.1:8088/viewer/>. В Visual Studio команда работает во встроенном терминале, NuGet-пакеты для просмотра не нужны. Для другого порта: `--port 8090`. Остановка: Ctrl+C.

Стандартный Swagger UI показывает теги, запросы, ответы, схемы и поиск. Данные читаются из актуального `openapi.yaml`, встроенной копии API нет. Теги зон идут последовательно. Выполнение запросов отключено. Swagger UI 5.17.14 загружается с CDN: для интерфейса нужен интернет, спецификация и проверки локальные. Внешний Swagger validator отключён. Для полностью автономного просмотра используйте локальный OAS-редактор.

Multipart отображается как бинарный ответ. Связи и порядок MIME-частей объясняет отдельный протокол; Swagger не проверяет их автоматически.
