# Практические HTTP-примеры

[Оглавление](../README.md) · [Авторизация](FOUNDATION_GUIDE.md) · [CMS](CONTENT.md)

Это примеры контракта, а не записи работающего сервера. Все имена, ключи, пароли и токены вымышлены. Запросы выполняются на одном условном HTTPS-origin `https://api.example.test`. HTTP-клиент должен сохранять cookie из ответов; реальные значения Set-Cookie выдаёт backend. В браузере Cookie устанавливает сервер, а не JavaScript.

Каждый блок связан с operationId и проверяется `tools/check_docs.py`: метод, путь, обязательные заголовки, query, Content-Type, статус и JSON-схема. Связь последовательных версий здесь показана вручную; SQL-транзакции не симулируются.

## 1. CSRF, регистрация и подтверждение почты

Сначала создаём анонимный контекст и получаем CSRF. В следующих мутациях example-csrf-current заменяется актуальным значением token. Регистрация не выполняет вход.

<!-- contract: {"operationId":"getCsrfToken","kind":"request"} -->
```http
GET /api/auth/csrf HTTP/1.1
Host: api.example.test
```

<!-- contract: {"operationId":"getCsrfToken","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
Content-Type: application/json

{
  "token": "example-csrf-current"
}
```

<!-- contract: {"operationId":"register","kind":"request"} -->
```http
POST /api/auth/register HTTP/1.1
Host: api.example.test
X-CSRF-Token: example-csrf-current
Content-Type: application/json

{
  "username": "example_reader",
  "displayName": "Читатель",
  "email": "reader@example.test",
  "password": "Example-only-9"
}
```

<!-- contract: {"operationId":"register","kind":"response","status":201} -->
```http
HTTP/1.1 201
Cache-Control: no-store
Content-Type: application/json

{
  "status": "registered",
  "message": "Аккаунт создан, подтверждение поставлено в очередь."
}
```

Токен поступает в служебном письме. GET по ссылке не подтверждает аккаунт: интерфейс передаёт токен телом POST после получения CSRF. Пример не содержит настоящего токена.

<!-- contract: {"operationId":"verifyEmail","kind":"request"} -->
```http
POST /api/auth/email/verify HTTP/1.1
Host: api.example.test
X-CSRF-Token: example-csrf-current
Content-Type: application/json

{
  "token": "example-email-token"
}
```

<!-- contract: {"operationId":"verifyEmail","kind":"response","status":204} -->
```http
HTTP/1.1 204
Cache-Control: no-store
```

## 2. Вход с 2FA и текущая сессия

Для этого сценария второй фактор ранее настроен. После login получить новый CSRF из GET /api/auth/csrf, затем отправить challenge. После успешного challenge повторить получение CSRF и session.

<!-- contract: {"operationId":"login","kind":"request"} -->
```http
POST /api/auth/login HTTP/1.1
Host: api.example.test
X-CSRF-Token: example-csrf-current
Content-Type: application/json

{
  "login": "reader@example.test",
  "password": "Example-only-9"
}
```

<!-- contract: {"operationId":"login","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
Content-Type: application/json

{
  "state": "two_factor_required",
  "user": {
    "id": "example-user-1",
    "username": "example_reader",
    "displayName": "Читатель",
    "email": "reader@example.test",
    "emailVerified": true,
    "role": "user",
    "twoFactorEnabled": true,
    "avatarUrl": null
  },
  "capabilities": {
    "canComment": false,
    "canReact": false,
    "canUseCms": false,
    "canModerate": false,
    "canManageUsers": false
  },
  "expiresAt": "2026-11-02T20:00:00Z",
  "nextStep": "enter_2fa"
}
```

<!-- contract: {"operationId":"getCsrfToken","kind":"request"} -->
```http
GET /api/auth/csrf HTTP/1.1
Host: api.example.test
```

<!-- contract: {"operationId":"getCsrfToken","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
Content-Type: application/json

{
  "token": "example-csrf-current"
}
```

<!-- contract: {"operationId":"confirmLoginSecondFactor","kind":"request"} -->
```http
POST /api/auth/2fa/challenge HTTP/1.1
Host: api.example.test
X-CSRF-Token: example-csrf-current
Content-Type: application/json

{
  "method": "totp",
  "code": "123456"
}
```

<!-- contract: {"operationId":"confirmLoginSecondFactor","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
Content-Type: application/json

{
  "state": "active",
  "user": {
    "id": "example-user-1",
    "username": "example_reader",
    "displayName": "Читатель",
    "email": "reader@example.test",
    "emailVerified": true,
    "role": "user",
    "twoFactorEnabled": true,
    "avatarUrl": null
  },
  "capabilities": {
    "canComment": true,
    "canReact": true,
    "canUseCms": false,
    "canModerate": false,
    "canManageUsers": false
  },
  "expiresAt": "2026-11-02T20:00:00Z",
  "nextStep": null
}
```

<!-- contract: {"operationId":"getCsrfToken","kind":"request"} -->
```http
GET /api/auth/csrf HTTP/1.1
Host: api.example.test
```

<!-- contract: {"operationId":"getCsrfToken","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
Content-Type: application/json

{
  "token": "example-csrf-current"
}
```

<!-- contract: {"operationId":"getSession","kind":"request"} -->
```http
GET /api/auth/session HTTP/1.1
Host: api.example.test
```

<!-- contract: {"operationId":"getSession","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
Content-Type: application/json

{
  "state": "active",
  "user": {
    "id": "example-user-1",
    "username": "example_reader",
    "displayName": "Читатель",
    "email": "reader@example.test",
    "emailVerified": true,
    "role": "user",
    "twoFactorEnabled": true,
    "avatarUrl": null
  },
  "capabilities": {
    "canComment": true,
    "canReact": true,
    "canUseCms": false,
    "canModerate": false,
    "canManageUsers": false
  },
  "expiresAt": "2026-11-02T20:00:00Z",
  "nextStep": null
}
```

## 3. Создание и публикация новости

Следующие CMS-запросы выполняет отдельный Admin/Owner, прошедший email и 2FA, с собственным свежим CSRF. Сессия обычного читателя из предыдущего раздела не даёт CMS-доступ. Показаны вымышленные редакторские тексты.

<!-- contract: {"operationId":"createCmsNews","kind":"request"} -->
```http
POST /api/cms/news HTTP/1.1
Host: api.example.test
X-CSRF-Token: example-csrf-current
Content-Type: application/json

{
  "title": "Пример заголовка",
  "summary": "Пример краткого описания.",
  "bodyMarkdown": "Текст для проверки контракта.",
  "coverMediaId": null
}
```

<!-- contract: {"operationId":"createCmsNews","kind":"response","status":201} -->
```http
HTTP/1.1 201
Cache-Control: no-store
ETag: "1"
Content-Type: application/json

{
  "id": "example-news-1",
  "status": "draft",
  "draft": {
    "title": "Пример заголовка",
    "summary": "Пример краткого описания.",
    "bodyMarkdown": "Текст для проверки контракта.",
    "coverMediaId": null
  },
  "published": null,
  "scheduledAt": null,
  "editVersion": 1,
  "commentsEnabled": true
}
```

<!-- contract: {"operationId":"publishNews","kind":"request"} -->
```http
POST /api/cms/news/example-news-1/publish HTTP/1.1
Host: api.example.test
X-CSRF-Token: example-csrf-current
If-Match: "1"
Content-Type: application/json

{
  "mode": "now",
  "scheduledAt": null
}
```

<!-- contract: {"operationId":"publishNews","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
ETag: "2"
Content-Type: application/json

{
  "id": "example-news-1",
  "status": "published",
  "draft": null,
  "published": {
    "id": "example-news-1",
    "title": "Пример заголовка",
    "summary": "Пример краткого описания.",
    "bodyMarkdown": "Текст для проверки контракта.",
    "coverUrl": null,
    "publishedAt": "2026-11-02T19:00:00Z",
    "editedAt": null,
    "commentsEnabled": true
  },
  "scheduledAt": null,
  "editVersion": 2,
  "commentsEnabled": true
}
```

## 4. Правка опубликованного материала

GET возвращает обе версии и ETag. PUT сохраняет полный рабочий draft, публикация отдельно. Пока не выполнен второй publish, посетители видят прежний текст.

<!-- contract: {"operationId":"getCmsNews","kind":"request"} -->
```http
GET /api/cms/news/example-news-1 HTTP/1.1
Host: api.example.test
```

<!-- contract: {"operationId":"getCmsNews","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
ETag: "2"
Content-Type: application/json

{
  "id": "example-news-1",
  "status": "published",
  "draft": null,
  "published": {
    "id": "example-news-1",
    "title": "Пример заголовка",
    "summary": "Пример краткого описания.",
    "bodyMarkdown": "Текст для проверки контракта.",
    "coverUrl": null,
    "publishedAt": "2026-11-02T19:00:00Z",
    "editedAt": null,
    "commentsEnabled": true
  },
  "scheduledAt": null,
  "editVersion": 2,
  "commentsEnabled": true
}
```

<!-- contract: {"operationId":"saveNewsDraft","kind":"request"} -->
```http
PUT /api/cms/news/example-news-1/draft HTTP/1.1
Host: api.example.test
X-CSRF-Token: example-csrf-current
If-Match: "2"
Content-Type: application/json

{
  "title": "Пример заголовка",
  "summary": "Пример краткого описания.",
  "bodyMarkdown": "Исправленный пример текста.",
  "coverMediaId": null
}
```

<!-- contract: {"operationId":"saveNewsDraft","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
ETag: "3"
Content-Type: application/json

{
  "id": "example-news-1",
  "status": "published",
  "draft": {
    "title": "Пример заголовка",
    "summary": "Пример краткого описания.",
    "bodyMarkdown": "Исправленный пример текста.",
    "coverMediaId": null
  },
  "published": {
    "id": "example-news-1",
    "title": "Пример заголовка",
    "summary": "Пример краткого описания.",
    "bodyMarkdown": "Текст для проверки контракта.",
    "coverUrl": null,
    "publishedAt": "2026-11-02T19:00:00Z",
    "editedAt": null,
    "commentsEnabled": true
  },
  "scheduledAt": null,
  "editVersion": 3,
  "commentsEnabled": true
}
```

<!-- contract: {"operationId":"publishNews","kind":"request"} -->
```http
POST /api/cms/news/example-news-1/publish HTTP/1.1
Host: api.example.test
X-CSRF-Token: example-csrf-current
If-Match: "3"
Content-Type: application/json

{
  "mode": "now",
  "scheduledAt": null
}
```

<!-- contract: {"operationId":"publishNews","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
ETag: "4"
Content-Type: application/json

{
  "id": "example-news-1",
  "status": "published",
  "draft": null,
  "published": {
    "id": "example-news-1",
    "title": "Пример заголовка",
    "summary": "Пример краткого описания.",
    "bodyMarkdown": "Исправленный пример текста.",
    "coverUrl": null,
    "publishedAt": "2026-11-02T19:00:00Z",
    "editedAt": "2026-11-02T19:05:00Z",
    "commentsEnabled": true
  },
  "scheduledAt": null,
  "editVersion": 4,
  "commentsEnabled": true
}
```

## 5. Комментарий и модерация

Читатель снова использует собственную active-сессию и CSRF. Материал опубликован, комментарии включены, бан отсутствует. Для ответа вместо null передаются id корня и адресата из ранее полученного обсуждения.

<!-- contract: {"operationId":"createNewsComment","kind":"request"} -->
```http
POST /api/news/example-news-1/comments HTTP/1.1
Host: api.example.test
X-CSRF-Token: example-csrf-current
Content-Type: application/json

{
  "text": "Пример комментария.",
  "rootId": null,
  "replyToCommentId": null
}
```

<!-- contract: {"operationId":"createNewsComment","kind":"response","status":201} -->
```http
HTTP/1.1 201
Cache-Control: no-store
Content-Type: application/json

{
  "id": "example-comment-1",
  "materialType": "news",
  "materialId": "example-news-1",
  "rootId": null,
  "replyToCommentId": null,
  "author": {
    "id": "example-user-1",
    "displayName": "Читатель",
    "avatarUrl": null,
    "deleted": false
  },
  "text": "Пример комментария.",
  "createdAt": "2026-11-02T19:06:00Z",
  "editedAt": null,
  "isPlaceholder": false,
  "repliesCount": 0
}
```

Модератор использует свою active-сессию, получает список и подтверждает скрытие в интерфейсе. Закрытый ответ модерации может содержать скрытый модератором текст, но никогда текст, стёртый автором.

<!-- contract: {"operationId":"listModerationComments","kind":"request"} -->
```http
GET /api/moderation/comments?page=1&pageSize=12&status=visible HTTP/1.1
Host: api.example.test
```

<!-- contract: {"operationId":"listModerationComments","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
Content-Type: application/json

{
  "items": [
    {
      "comment": {
        "id": "example-comment-1",
        "materialType": "news",
        "materialId": "example-news-1",
        "rootId": null,
        "replyToCommentId": null,
        "author": {
          "id": "example-user-1",
          "displayName": "Читатель",
          "avatarUrl": null,
          "deleted": false
        },
        "text": "Пример комментария.",
        "createdAt": "2026-11-02T19:06:00Z",
        "editedAt": null,
        "isPlaceholder": false,
        "repliesCount": 0
      },
      "moderationStatus": "visible",
      "hiddenAt": null,
      "hiddenReason": null
    }
  ],
  "page": 1,
  "pageSize": 12,
  "nextPage": null
}
```

<!-- contract: {"operationId":"hideComment","kind":"request"} -->
```http
POST /api/moderation/comments/example-comment-1/hide HTTP/1.1
Host: api.example.test
X-CSRF-Token: example-csrf-current
Content-Type: application/json

{
  "reason": "Пример причины модерации."
}
```

<!-- contract: {"operationId":"hideComment","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
Content-Type: application/json

{
  "comment": {
    "id": "example-comment-1",
    "materialType": "news",
    "materialId": "example-news-1",
    "rootId": null,
    "replyToCommentId": null,
    "author": {
      "id": "example-user-1",
      "displayName": "Читатель",
      "avatarUrl": null,
      "deleted": false
    },
    "text": "Пример комментария.",
    "createdAt": "2026-11-02T19:06:00Z",
    "editedAt": null,
    "isPlaceholder": false,
    "repliesCount": 0
  },
  "moderationStatus": "hidden",
  "hiddenAt": "2026-11-02T19:07:00Z",
  "hiddenReason": "Пример причины модерации."
}
```

## 6. Корзина и восстановление

Редактор перемещает материал с версией 4 в корзину, затем восстанавливает с новой версией 5. Восстановление не публикует. При иной текущей версии сначала GET, иначе 412.

<!-- contract: {"operationId":"trashNews","kind":"request"} -->
```http
DELETE /api/cms/news/example-news-1 HTTP/1.1
Host: api.example.test
X-CSRF-Token: example-csrf-current
If-Match: "4"
```

<!-- contract: {"operationId":"trashNews","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
ETag: "5"
Content-Type: application/json

{
  "id": "example-news-1",
  "status": "trashed",
  "draft": null,
  "published": {
    "id": "example-news-1",
    "title": "Пример заголовка",
    "summary": "Пример краткого описания.",
    "bodyMarkdown": "Исправленный пример текста.",
    "coverUrl": null,
    "publishedAt": "2026-11-02T19:00:00Z",
    "editedAt": "2026-11-02T19:05:00Z",
    "commentsEnabled": true
  },
  "scheduledAt": null,
  "editVersion": 5,
  "commentsEnabled": true
}
```

<!-- contract: {"operationId":"restoreTrashedNews","kind":"request"} -->
```http
POST /api/cms/news/example-news-1/restore HTTP/1.1
Host: api.example.test
X-CSRF-Token: example-csrf-current
If-Match: "5"
```

<!-- contract: {"operationId":"restoreTrashedNews","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
ETag: "6"
Content-Type: application/json

{
  "id": "example-news-1",
  "status": "draft",
  "draft": {
    "title": "Пример заголовка",
    "summary": "Пример краткого описания.",
    "bodyMarkdown": "Исправленный пример текста.",
    "coverMediaId": null
  },
  "published": {
    "id": "example-news-1",
    "title": "Пример заголовка",
    "summary": "Пример краткого описания.",
    "bodyMarkdown": "Исправленный пример текста.",
    "coverUrl": null,
    "publishedAt": "2026-11-02T19:00:00Z",
    "editedAt": "2026-11-02T19:05:00Z",
    "commentsEnabled": true
  },
  "scheduledAt": null,
  "editVersion": 6,
  "commentsEnabled": true
}
```

Восстановленная запись может хранить прежний published-снимок для редактора, но status=draft исключает публичный доступ. Публикация требует отдельного действия.

## 7. Загрузка текстов Мировой Машины

При открытии консоли выполняется один запрос. example-key обозначает условный заранее зарегистрированный ключ, а не новый элемент лора. Дальнейшие перемещения используют полученный items.

<!-- contract: {"operationId":"getWorldMachineTexts","kind":"request"} -->
```http
GET /api/world-machine/texts HTTP/1.1
Host: api.example.test
```

<!-- contract: {"operationId":"getWorldMachineTexts","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: public, no-cache, must-revalidate
ETag: "example-generation-1"
Content-Type: application/json

{
  "contentGeneration": "example-generation-1",
  "items": [
    {
      "key": "example-key",
      "title": "Пример",
      "bodyMarkdown": "Текст примера."
    }
  ]
}
```

<!-- contract: {"operationId":"getWorldMachineTexts","kind":"request"} -->
```http
GET /api/world-machine/texts HTTP/1.1
Host: api.example.test
If-None-Match: "example-generation-1"
```

<!-- contract: {"operationId":"getWorldMachineTexts","kind":"response","status":304} -->
```http
HTTP/1.1 304
Cache-Control: public, no-cache, must-revalidate
ETag: "example-generation-1"
```

## 8. Подготовка и атомарная публикация пакета

Администратор получает версии, сохраняет два черновика и использует версии именно после сохранения. Пример объединяет текст Мировой Машины и описание игры; новости в пакет не входят.

<!-- contract: {"operationId":"getCmsWorldMachineText","kind":"request"} -->
```http
GET /api/cms/world-machine/texts/example-key HTTP/1.1
Host: api.example.test
```

<!-- contract: {"operationId":"getCmsWorldMachineText","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
ETag: "wm-1"
Content-Type: application/json

{
  "key": "example-key",
  "editVersion": 1,
  "published": {
    "title": "Пример",
    "bodyMarkdown": "Текст примера."
  }
}
```

<!-- contract: {"operationId":"saveWorldMachineTextDraft","kind":"request"} -->
```http
PUT /api/cms/world-machine/texts/example-key/draft HTTP/1.1
Host: api.example.test
X-CSRF-Token: example-csrf-current
If-Match: "wm-1"
Content-Type: application/json

{
  "title": "Пример",
  "bodyMarkdown": "Исправленный текст."
}
```

<!-- contract: {"operationId":"saveWorldMachineTextDraft","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
ETag: "wm-2"
Content-Type: application/json

{
  "key": "example-key",
  "editVersion": 2,
  "published": {
    "title": "Пример",
    "bodyMarkdown": "Текст примера."
  },
  "draft": {
    "title": "Пример",
    "bodyMarkdown": "Исправленный текст."
  }
}
```

<!-- contract: {"operationId":"getCmsGameSummary","kind":"request"} -->
```http
GET /api/cms/game-summary HTTP/1.1
Host: api.example.test
```

<!-- contract: {"operationId":"getCmsGameSummary","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
ETag: "1"
Content-Type: application/json

{
  "published": {
    "shortDescription": "Пример описания.",
    "tagline": null
  },
  "draft": null,
  "editVersion": 1
}
```

<!-- contract: {"operationId":"saveGameSummaryDraft","kind":"request"} -->
```http
PUT /api/cms/game-summary/draft HTTP/1.1
Host: api.example.test
X-CSRF-Token: example-csrf-current
If-Match: "1"
Content-Type: application/json

{
  "shortDescription": "Обновлённый пример.",
  "tagline": null
}
```

<!-- contract: {"operationId":"saveGameSummaryDraft","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
ETag: "2"
Content-Type: application/json

{
  "published": {
    "shortDescription": "Пример описания.",
    "tagline": null
  },
  "draft": {
    "shortDescription": "Обновлённый пример.",
    "tagline": null
  },
  "editVersion": 2
}
```

<!-- contract: {"operationId":"validatePublicationBatch","kind":"request"} -->
```http
POST /api/cms/publication-batches/validate HTTP/1.1
Host: api.example.test
X-CSRF-Token: example-csrf-current
Content-Type: application/json

{
  "items": [
    {
      "type": "worldMachineText",
      "resourceKey": "example-key",
      "expectedEditVersion": 2
    },
    {
      "type": "gameSummary",
      "resourceKey": "game-summary",
      "expectedEditVersion": 2
    }
  ]
}
```

<!-- contract: {"operationId":"validatePublicationBatch","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
Content-Type: application/json

{
  "canPublish": true,
  "items": [
    {
      "type": "worldMachineText",
      "resourceKey": "example-key",
      "ready": true,
      "issues": []
    },
    {
      "type": "gameSummary",
      "resourceKey": "game-summary",
      "ready": true,
      "issues": []
    }
  ]
}
```

<!-- contract: {"operationId":"publishPublicationBatch","kind":"request"} -->
```http
POST /api/cms/publication-batches/publish HTTP/1.1
Host: api.example.test
X-CSRF-Token: example-csrf-current
Idempotency-Key: example-batch-key-0001
Content-Type: application/json

{
  "items": [
    {
      "type": "worldMachineText",
      "resourceKey": "example-key",
      "expectedEditVersion": 2
    },
    {
      "type": "gameSummary",
      "resourceKey": "game-summary",
      "expectedEditVersion": 2
    }
  ]
}
```

<!-- contract: {"operationId":"publishPublicationBatch","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
Content-Type: application/json

{
  "batchId": "example-batch-1",
  "publishedAt": "2026-11-02T19:10:00Z",
  "items": [
    {
      "type": "worldMachineText",
      "resourceKey": "example-key",
      "newEditVersion": 3
    },
    {
      "type": "gameSummary",
      "resourceKey": "game-summary",
      "newEditVersion": 3
    }
  ]
}
```

Если ответ потерян, повторяется тот же запрос, тело и Idempotency-Key. Нельзя заменять ключ при автоматическом повторе. Изменение тела требует нового пользовательского действия и нового ключа.

## 9. Скачивание ZIP PressKit

Сначала читаем публичные метаданные. URL берётся из zipUrl, не вычисляется по текущей дате. Если zipUrl=null на этапе реализации, скачивание недоступно. Пример содержит вымышленные сведения, не описание игры.

<!-- contract: {"operationId":"getPublicPressKit","kind":"request"} -->
```http
GET /api/presskit HTTP/1.1
Host: api.example.test
```

<!-- contract: {"operationId":"getPublicPressKit","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
Content-Type: application/json

{
  "content": {
    "gameTitle": "Пример",
    "shortDescription": "Краткий пример.",
    "longDescription": "Подробный пример.",
    "genre": "Пример жанра",
    "releaseStatus": "Пример статуса",
    "platforms": [],
    "logoMediaId": null,
    "screenshotMediaIds": [],
    "artMediaIds": [],
    "trailerUrl": null,
    "pressEmail": null,
    "socialUrls": []
  },
  "media": [],
  "zipUrl": "https://api.example.test/api/presskit/archive/example-snapshot-1"
}
```

<!-- contract: {"operationId":"downloadPressKitArchive","kind":"request"} -->
```http
GET /api/presskit/archive/example-snapshot-1 HTTP/1.1
Host: api.example.test
```

<!-- contract: {"operationId":"downloadPressKitArchive","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: public, max-age=3600
Content-Type: application/zip
Content-Disposition: attachment; filename="Zarya-PressKit.zip"
ETag: "example-zip-1"
```

После заголовков последнего ответа следуют бинарные байты ZIP, которые здесь не воспроизводятся. Валидатор примеров проверяет media type и заголовки, но не содержимое реального архива.

## 10. Конфликт редакторской версии

Пример отказа повторного publish со старой версией. Перед новым действием прочитать состояние, не заменять ETag автоматически.

<!-- contract: {"operationId":"publishNews","kind":"response","status":412} -->
```http
HTTP/1.1 412
Cache-Control: no-store
Content-Type: application/json

{
  "code": "EDIT_VERSION_CONFLICT",
  "message": "Материал изменён другим запросом."
}
```

## 11. R04: username и ограниченный вход

Альтернатива входу по email из раздела 2: тот же login принимает username, включая другой регистр. Этот независимый пример относится к моменту до подтверждения почты. Предварительно получить CSRF и сохранить cookie, как в разделе 1. Пароль и настроенная 2FA не обходятся: до подтверждения email доступен только ограниченный режим. displayName не используется для входа.

<!-- contract: {"operationId":"login","kind":"request"} -->
```http
POST /api/auth/login HTTP/1.1
Host: api.example.test
X-CSRF-Token: example-csrf-current
Content-Type: application/json

{"login":"EXAMPLE_READER","password":"Example-only-9"}
```

<!-- contract: {"operationId":"login","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
Content-Type: application/json

{
  "state":"email_verification_required",
  "user":{"id":"example-user-1","username":"example_reader","displayName":"Читатель","email":"reader@example.test","emailVerified":false,"role":"user","twoFactorEnabled":true,"avatarUrl":null},
  "capabilities":{"canComment":false,"canReact":false,"canUseCms":false,"canModerate":false,"canManageUsers":false},
  "nextStep":"verify_email"
}
```

## 12. R04: передача полномочий владельца

Текущий Owner использует свою active-сессию и свежий CSRF. Цель example-next-owner является другим существующим аккаунтом с подтверждённой почтой и настроенной 2FA; её id и статус проверяются через существующий GET /api/admin/users/{userId}. Пароль и TOTP ниже вымышлены. Нельзя передавать новую роль в теле или назначать owner обычным RoleChangeRequest.

<!-- contract: {"operationId":"transferOwnership","kind":"request"} -->
```http
POST /api/owner/transfer HTTP/1.1
Host: api.example.test
X-CSRF-Token: example-csrf-current
Content-Type: application/json

{"targetUserId":"example-next-owner","password":"Example-only-9","totpCode":"123456"}
```

<!-- contract: {"operationId":"transferOwnership","kind":"response","status":204} -->
```http
HTTP/1.1 204
Cache-Control: no-store
```

После commit новый владелец имеет owner, прежний user, независимо от прежних административных полномочий. Старые привилегированные сессии отозваны. Проверка прежней cookie возвращает anonymous; после нового входа и предусмотренной проверки 2FA профиль прежнего владельца должен содержать role=user. Это ожидаемое серверное поведение, не результат интеграционного теста.

<!-- contract: {"operationId":"getSession","kind":"request"} -->
```http
GET /api/auth/session HTTP/1.1
Host: api.example.test
```

<!-- contract: {"operationId":"getSession","kind":"response","status":200} -->
```http
HTTP/1.1 200
Cache-Control: no-store
Content-Type: application/json

{"state":"anonymous","user":null,"capabilities":{"canComment":false,"canReact":false,"canUseCms":false,"canModerate":false,"canManageUsers":false},"expiresAt":null,"nextStep":null}
```
