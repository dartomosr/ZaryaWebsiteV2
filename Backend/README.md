# Backend

ASP.NET Core API на **.NET 10**. Текущие обработчики читают новости и обновления из JSON, изображения — из каталога файлов. EF Core и SQL Server в реализации не используются.

## Запуск

Нужен .NET SDK **10.x**. Из корня репозитория:

```powershell
dotnet build Backend/ZaryaWebSiteBackend/ZaryaWebSiteBackend.slnx

$env:NewsStorage__Path = (Resolve-Path Storage/news.json).Path
$env:UpdatesStorage__Path = (Resolve-Path Storage/updates.json).Path
$env:ImageStorage__Path = (Resolve-Path Storage/Images).Path

dotnet run --project Backend/ZaryaWebSiteBackend/ZaryaWebSiteBackend/ZaryaWebSite.WebApi.csproj --launch-profile http
```

HTTP-профиль использует [localhost:5257](http://localhost:5257). В Development доступна [OpenAPI-схема работающего приложения](http://localhost:5257/openapi/v1.json). Она отражает контроллеры сервера и отличается от полного проекта в `ApiContracts`.

Переменные задаются только для текущего терминала. Абсолютные пути устраняют зависимость от рабочего каталога: JSON-провайдер разрешает относительные пути от `AppContext.BaseDirectory`, путь изображений нормализуется от content root приложения. Без переопределения JSON по умолчанию ищется в `Storage` рядом с выходной сборкой; корневые файлы туда автоматически не копируются.

Остановка — `Ctrl+C`. После работы переменные можно убрать:

```powershell
Remove-Item Env:NewsStorage__Path, Env:UpdatesStorage__Path, Env:ImageStorage__Path
```

## Код и данные

Все серверные проекты находятся в `ZaryaWebSiteBackend`:

| Проект | Назначение |
| --- | --- |
| `ZaryaWebSiteBackend` | Запуск Web API, контроллеры и DTO |
| `ZaryaWebSite.Application` | MediatR-запросы, обработчики и интерфейсы провайдеров |
| `ZaryaWebSite.Domain` | Модели News и Update |
| `ZaryaWebSite.StorageProvider` | Чтение JSON и выборка страниц |
| `ZaryaWebSite.ImageProvider` | Поиск изображения по имени `<id>.*` |

Контроллеры предоставляют чтение списков и отдельных новостей/обновлений, а также изображений. Пагинация применяется к порядку записей JSON; сортировка и фильтр опубликованного состояния не реализованы. Отсутствующее изображение возвращает 404.

В [Storage](../Storage) находятся `news.json`, `updates.json` и `Images`. Данные JSON должны соответствовать моделям Domain. Запись материалов, аккаунты, сессии, серверные роли и рабочие операции CMS/модерации не реализованы. Отдельных серверных тестовых проектов нет.

## Совместимость с frontend

Frontend и проект OpenAPI ожидают `coverUrl`, текущие серверные DTO возвращают `urlToImage`. Клиент строго проверяет поля и отклоняет такой ответ. Поэтому запуск обоих процессов ещё не даёт рабочую интеграцию; требуется отдельная согласованная серверная доработка.

Обычный Vite-режим и preview проксируют `/api` на этот сервер. При прямых запросах с другого origin нужно отдельно настроить CORS: политика `Frontend` зарегистрирована, но middleware `UseCors` сейчас не подключён. Cookie-аутентификация и CSRF в серверном коде отсутствуют.

Набор исключений, обработка отсутствующих записей, валидация параметров и формат ошибок пока не полностью соответствуют [проекту API](../ApiContracts/README.md). Не использовать наличие маршрута как подтверждение полного контракта. Для разработки публичных страниц без этих ограничений используйте [mock-режим](../Frontend/README.md).
