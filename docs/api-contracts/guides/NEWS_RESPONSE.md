# GET /api/news: ответ Backend

[Оглавление](../README.md) · [Исходная операция](../core/news.yaml) · [Контроллер](../../../Backend/ZaryaWebSiteBackend/ZaryaWebSiteBackend/Controllers/NewsController.cs) · [DTO](../../../Backend/ZaryaWebSiteBackend/ZaryaWebSiteBackend/DTO/Response/NewsResponseDto.cs) · [Старый multipart-клиент](MULTIPART_NEWS.md)

## Запрос

`GET /api/news?page=1&pageSize=12`. Контроллер передаёт `page` и `pageSize` в выборку, затем возвращает `Ok(newsResponses)`. Ответ — JSON-массив без объекта пагинации; пустой результат — `[]`. Параметры запроса не повторяются в ответе.

## DTO и обложка

Элемент содержит `id`, `title`, `summary`, `url` и `publishedAt`, как в `NewsResponseDto`. `url` — не URL-строка: контроллер присваивает ему результат `PhysicalFile(imagePath, ...)`, поэтому в JSON это объект результата файла. В нём присутствуют `fileName`, `contentType`, `fileDownloadName`, `lastModified`, `entityTag` и `enableRangeProcessing`. `fileName` — путь изображения на сервере, не ссылка для браузера.

Контракт допускает `contentType` со значениями `image/jpeg`, `image/png` и `image/webp`:

```json
[
  {
    "id": "42",
    "title": "Пример",
    "summary": "Краткое описание",
    "url": {
      "fileName": "images/news/example.webp",
      "contentType": "image/webp",
      "fileDownloadName": "",
      "lastModified": null,
      "entityTag": null,
      "enableRangeProcessing": false
    },
    "publishedAt": "2026-11-02T19:00:00Z"
  }
]
```

Это описание DTO, а не утверждение, что все значения уже формируются корректно: контроллер сейчас передаёт `image/jpeg` конструктору `PhysicalFile` для любого изображения. Для фактического PNG/WebP значение MIME должно определяться по изображению, иначе оно не соответствует этому контракту.

Есть и ограничение сериализации: свойства `NewsResponseDto` объявлены `internal`, а [Program](../../../Backend/ZaryaWebSiteBackend/ZaryaWebSiteBackend/Program.cs) не настраивает сериализатор сверх стандартного `AddControllers()`. Стандартный `System.Text.Json` сериализует публичные свойства, поэтому фактические элементы ответа сейчас могут быть `{}`. OpenAPI описывает объявленную форму DTO; её нельзя считать проверенной wire-формой до исправления видимости/настройки сериализации и интеграционного теста.

## Совместимость клиента

Существующий Frontend/MSW ожидает `multipart/mixed`, а не этот JSON-ответ. Его парсер и тесты не изменены в этой задаче; синхронизация клиента с Backend требует отдельной работы. Исторический протокол парсера сохранён в [MULTIPART_NEWS.md](MULTIPART_NEWS.md), но не является контрактом текущего Backend.
