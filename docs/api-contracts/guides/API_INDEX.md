# Индекс API

<!-- GENERATED: tools/validate_contract.py --write -->

Статус: **PROPOSED**. Редактируйте исходный модуль, не эту таблицу.

Оглавление: [foundation](#foundation), [core](#core), [extended](#extended).

## foundation

### foundation.yaml

| Метод | Маршрут | operationId | Источник |
|---|---|---|---|
| GET | `/api/admin/users` | `listUsers` | [foundation.yaml](../foundation.yaml) |
| GET | `/api/admin/users/{userId}` | `getUserAdmin` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/admin/users/{userId}/2fa-recovery` | `startAssisted2faRecovery` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/admin/users/{userId}/password-recovery` | `startPasswordRecovery` | [foundation.yaml](../foundation.yaml) |
| PUT | `/api/admin/users/{userId}/role` | `changeUserRole` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/auth/2fa/assisted-recovery/complete` | `completeAssistedRecovery` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/auth/2fa/challenge` | `confirmLoginSecondFactor` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/auth/2fa/disable` | `disableOwnTwoFactor` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/auth/2fa/recovery-codes/rotate` | `rotateRecoveryCodes` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/auth/2fa/setup` | `startTwoFactorSetup` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/auth/2fa/setup/confirm` | `confirmTwoFactorSetup` | [foundation.yaml](../foundation.yaml) |
| GET | `/api/auth/csrf` | `getCsrfToken` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/auth/email/resend` | `resendVerificationEmail` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/auth/email/unverified-address` | `changeUnverifiedEmail` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/auth/email/verify` | `verifyEmail` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/auth/login` | `login` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/auth/logout` | `logout` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/auth/owner/emergency-key/rotate` | `rotateOwnerEmergencyKey` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/auth/owner/emergency-recovery/complete` | `completeOwnerEmergencyRecovery` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/auth/owner/emergency-recovery/request` | `requestOwnerEmergencyRecovery` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/auth/password-recovery/complete` | `completePasswordRecovery` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/auth/register` | `register` | [foundation.yaml](../foundation.yaml) |
| GET | `/api/auth/session` | `getSession` | [foundation.yaml](../foundation.yaml) |
| GET | `/api/me` | `getMe` | [foundation.yaml](../foundation.yaml) |
| PATCH | `/api/me` | `updateMe` | [foundation.yaml](../foundation.yaml) |
| DELETE | `/api/me/avatar` | `deleteAvatar` | [foundation.yaml](../foundation.yaml) |
| PUT | `/api/me/avatar` | `uploadAvatar` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/me/delete` | `deleteOwnAccount` | [foundation.yaml](../foundation.yaml) |
| DELETE | `/api/me/email-change` | `cancelPendingEmailChange` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/me/email-change` | `requestEmailChange` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/me/email-change/resend` | `resendPendingEmailChange` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/me/password` | `changePassword` | [foundation.yaml](../foundation.yaml) |
| POST | `/api/owner/transfer` | `transferOwnership` | [foundation.yaml](../foundation.yaml) |

## core

### core/news.yaml

| Метод | Маршрут | operationId | Источник |
|---|---|---|---|
| GET | `/api/news` | `listPublicNews` | [core/news.yaml](../core/news.yaml) |
| GET | `/api/news/{newsId}` | `getPublicNews` | [core/news.yaml](../core/news.yaml) |

### core/updates.yaml

| Метод | Маршрут | operationId | Источник |
|---|---|---|---|
| GET | `/api/updates` | `listPublicUpdates` | [core/updates.yaml](../core/updates.yaml) |
| GET | `/api/updates/{updateId}` | `getPublicUpdate` | [core/updates.yaml](../core/updates.yaml) |

### core/comments.yaml

| Метод | Маршрут | operationId | Источник |
|---|---|---|---|
| DELETE | `/api/comments/{commentId}` | `deleteOwnComment` | [core/comments.yaml](../core/comments.yaml) |
| PATCH | `/api/comments/{commentId}` | `editOwnComment` | [core/comments.yaml](../core/comments.yaml) |
| GET | `/api/comments/{rootCommentId}/replies` | `listCommentReplies` | [core/comments.yaml](../core/comments.yaml) |
| GET | `/api/news/{newsId}/comments` | `listNewsComments` | [core/comments.yaml](../core/comments.yaml) |
| POST | `/api/news/{newsId}/comments` | `createNewsComment` | [core/comments.yaml](../core/comments.yaml) |
| GET | `/api/updates/{updateId}/comments` | `listUpdateComments` | [core/comments.yaml](../core/comments.yaml) |
| POST | `/api/updates/{updateId}/comments` | `createUpdateComment` | [core/comments.yaml](../core/comments.yaml) |

### core/reactions.yaml

| Метод | Маршрут | operationId | Источник |
|---|---|---|---|
| DELETE | `/api/news/{newsId}/reaction` | `removeOwnNewsReaction` | [core/reactions.yaml](../core/reactions.yaml) |
| PUT | `/api/news/{newsId}/reaction` | `setOwnNewsReaction` | [core/reactions.yaml](../core/reactions.yaml) |
| GET | `/api/news/{newsId}/reactions` | `getNewsReactionCounts` | [core/reactions.yaml](../core/reactions.yaml) |
| GET | `/api/reactions/types` | `listReactionTypes` | [core/reactions.yaml](../core/reactions.yaml) |

### core/moderation.yaml

| Метод | Маршрут | operationId | Источник |
|---|---|---|---|
| GET | `/api/moderation/comment-bans` | `listCommentBans` | [core/moderation.yaml](../core/moderation.yaml) |
| GET | `/api/moderation/comments` | `listModerationComments` | [core/moderation.yaml](../core/moderation.yaml) |
| POST | `/api/moderation/comments/{commentId}/hide` | `hideComment` | [core/moderation.yaml](../core/moderation.yaml) |
| POST | `/api/moderation/comments/{commentId}/restore` | `restoreModeratedComment` | [core/moderation.yaml](../core/moderation.yaml) |
| DELETE | `/api/moderation/users/{userId}/comment-ban` | `removeCommentBan` | [core/moderation.yaml](../core/moderation.yaml) |
| PUT | `/api/moderation/users/{userId}/comment-ban` | `setCommentBan` | [core/moderation.yaml](../core/moderation.yaml) |

### core/cms-news.yaml

| Метод | Маршрут | operationId | Источник |
|---|---|---|---|
| GET | `/api/cms/news` | `listCmsNews` | [core/cms-news.yaml](../core/cms-news.yaml) |
| POST | `/api/cms/news` | `createCmsNews` | [core/cms-news.yaml](../core/cms-news.yaml) |
| DELETE | `/api/cms/news/{newsId}` | `trashNews` | [core/cms-news.yaml](../core/cms-news.yaml) |
| GET | `/api/cms/news/{newsId}` | `getCmsNews` | [core/cms-news.yaml](../core/cms-news.yaml) |
| PATCH | `/api/cms/news/{newsId}/comments-settings` | `setNewsCommentsEnabled` | [core/cms-news.yaml](../core/cms-news.yaml) |
| DELETE | `/api/cms/news/{newsId}/draft` | `discardNewsDraft` | [core/cms-news.yaml](../core/cms-news.yaml) |
| PUT | `/api/cms/news/{newsId}/draft` | `saveNewsDraft` | [core/cms-news.yaml](../core/cms-news.yaml) |
| POST | `/api/cms/news/{newsId}/permanent-delete` | `permanentlyDeleteNews` | [core/cms-news.yaml](../core/cms-news.yaml) |
| POST | `/api/cms/news/{newsId}/publish` | `publishNews` | [core/cms-news.yaml](../core/cms-news.yaml) |
| POST | `/api/cms/news/{newsId}/restore` | `restoreTrashedNews` | [core/cms-news.yaml](../core/cms-news.yaml) |
| GET | `/api/cms/news/{newsId}/revisions` | `listNewsRevisions` | [core/cms-news.yaml](../core/cms-news.yaml) |
| GET | `/api/cms/news/{newsId}/revisions/{revisionId}` | `getNewsRevision` | [core/cms-news.yaml](../core/cms-news.yaml) |
| POST | `/api/cms/news/{newsId}/revisions/{revisionId}/restore` | `restoreNewsRevisionToDraft` | [core/cms-news.yaml](../core/cms-news.yaml) |
| POST | `/api/cms/news/{newsId}/unpublish` | `unpublishNews` | [core/cms-news.yaml](../core/cms-news.yaml) |
| POST | `/api/cms/news/{newsId}/unschedule` | `unscheduleNews` | [core/cms-news.yaml](../core/cms-news.yaml) |

### core/cms-updates.yaml

| Метод | Маршрут | operationId | Источник |
|---|---|---|---|
| GET | `/api/cms/updates` | `listCmsUpdate` | [core/cms-updates.yaml](../core/cms-updates.yaml) |
| POST | `/api/cms/updates` | `createCmsUpdate` | [core/cms-updates.yaml](../core/cms-updates.yaml) |
| DELETE | `/api/cms/updates/{updateId}` | `trashUpdate` | [core/cms-updates.yaml](../core/cms-updates.yaml) |
| GET | `/api/cms/updates/{updateId}` | `getCmsUpdate` | [core/cms-updates.yaml](../core/cms-updates.yaml) |
| PATCH | `/api/cms/updates/{updateId}/comments-settings` | `setUpdateCommentsEnabled` | [core/cms-updates.yaml](../core/cms-updates.yaml) |
| DELETE | `/api/cms/updates/{updateId}/draft` | `discardUpdateDraft` | [core/cms-updates.yaml](../core/cms-updates.yaml) |
| PUT | `/api/cms/updates/{updateId}/draft` | `saveUpdateDraft` | [core/cms-updates.yaml](../core/cms-updates.yaml) |
| POST | `/api/cms/updates/{updateId}/permanent-delete` | `permanentlyDeleteUpdate` | [core/cms-updates.yaml](../core/cms-updates.yaml) |
| POST | `/api/cms/updates/{updateId}/publish` | `publishUpdate` | [core/cms-updates.yaml](../core/cms-updates.yaml) |
| POST | `/api/cms/updates/{updateId}/restore` | `restoreTrashedUpdate` | [core/cms-updates.yaml](../core/cms-updates.yaml) |
| GET | `/api/cms/updates/{updateId}/revisions` | `listUpdateRevisions` | [core/cms-updates.yaml](../core/cms-updates.yaml) |
| GET | `/api/cms/updates/{updateId}/revisions/{revisionId}` | `getUpdateRevision` | [core/cms-updates.yaml](../core/cms-updates.yaml) |
| POST | `/api/cms/updates/{updateId}/revisions/{revisionId}/restore` | `restoreUpdateRevisionToDraft` | [core/cms-updates.yaml](../core/cms-updates.yaml) |
| POST | `/api/cms/updates/{updateId}/unpublish` | `unpublishUpdate` | [core/cms-updates.yaml](../core/cms-updates.yaml) |
| POST | `/api/cms/updates/{updateId}/unschedule` | `unscheduleUpdate` | [core/cms-updates.yaml](../core/cms-updates.yaml) |

### core/faq.yaml

| Метод | Маршрут | operationId | Источник |
|---|---|---|---|
| GET | `/api/cms/faq` | `getCmsFaq` | [core/faq.yaml](../core/faq.yaml) |
| POST | `/api/cms/faq/items` | `createFaqItemDraft` | [core/faq.yaml](../core/faq.yaml) |
| GET | `/api/cms/faq/items/{faqId}` | `getCmsFaqItem` | [core/faq.yaml](../core/faq.yaml) |
| PUT | `/api/cms/faq/items/{faqId}/draft` | `saveFaqItemDraft` | [core/faq.yaml](../core/faq.yaml) |
| POST | `/api/cms/faq/items/{faqId}/publish` | `publishFaqItem` | [core/faq.yaml](../core/faq.yaml) |
| POST | `/api/cms/faq/items/{faqId}/stage-delete` | `stageFaqItemDelete` | [core/faq.yaml](../core/faq.yaml) |
| PUT | `/api/cms/faq/order/draft` | `saveFaqOrderDraft` | [core/faq.yaml](../core/faq.yaml) |
| POST | `/api/cms/faq/order/publish` | `publishFaqOrder` | [core/faq.yaml](../core/faq.yaml) |
| GET | `/api/faq` | `getPublicFaq` | [core/faq.yaml](../core/faq.yaml) |

### core/presskit.yaml

| Метод | Маршрут | operationId | Источник |
|---|---|---|---|
| GET | `/api/cms/presskit` | `getCmsPressKit` | [core/presskit.yaml](../core/presskit.yaml) |
| PUT | `/api/cms/presskit/draft` | `savePressKitDraft` | [core/presskit.yaml](../core/presskit.yaml) |
| POST | `/api/cms/presskit/publish` | `publishPressKit` | [core/presskit.yaml](../core/presskit.yaml) |
| GET | `/api/presskit` | `getPublicPressKit` | [core/presskit.yaml](../core/presskit.yaml) |

### core/game-summary.yaml

| Метод | Маршрут | operationId | Источник |
|---|---|---|---|
| GET | `/api/cms/game-summary` | `getCmsGameSummary` | [core/game-summary.yaml](../core/game-summary.yaml) |
| PUT | `/api/cms/game-summary/draft` | `saveGameSummaryDraft` | [core/game-summary.yaml](../core/game-summary.yaml) |
| POST | `/api/cms/game-summary/publish` | `publishGameSummary` | [core/game-summary.yaml](../core/game-summary.yaml) |
| GET | `/api/game/summary` | `getPublicGameSummary` | [core/game-summary.yaml](../core/game-summary.yaml) |

### core/media.yaml

| Метод | Маршрут | operationId | Источник |
|---|---|---|---|
| GET | `/api/cms/media` | `listMedia` | [core/media.yaml](../core/media.yaml) |
| POST | `/api/cms/media` | `uploadMedia` | [core/media.yaml](../core/media.yaml) |
| DELETE | `/api/cms/media/{mediaId}` | `deleteCmsMedia` | [core/media.yaml](../core/media.yaml) |
| GET | `/api/cms/media/{mediaId}` | `getCmsMedia` | [core/media.yaml](../core/media.yaml) |
| GET | `/api/cms/media/{mediaId}/references` | `listMediaReferences` | [core/media.yaml](../core/media.yaml) |
| GET | `/api/images/{id}` | `getPublicImage` | [core/media.yaml](../core/media.yaml) |

## extended

### extended.yaml

| Метод | Маршрут | operationId | Источник |
|---|---|---|---|
| GET | `/api/cms/news/{newsId}/revision-diff` | `compareNewsRevisions` | [extended.yaml](../extended.yaml) |
| GET | `/api/cms/presskit/archive/preview-manifest` | `previewPressKitArchiveManifest` | [extended.yaml](../extended.yaml) |
| POST | `/api/cms/publication-batches/publish` | `publishPublicationBatch` | [extended.yaml](../extended.yaml) |
| POST | `/api/cms/publication-batches/validate` | `validatePublicationBatch` | [extended.yaml](../extended.yaml) |
| GET | `/api/cms/updates/{updateId}/revision-diff` | `compareUpdateRevisions` | [extended.yaml](../extended.yaml) |
| GET | `/api/cms/world-machine/preview` | `previewWorldMachineTexts` | [extended.yaml](../extended.yaml) |
| GET | `/api/cms/world-machine/texts` | `listCmsWorldMachineTexts` | [extended.yaml](../extended.yaml) |
| GET | `/api/cms/world-machine/texts/{textKey}` | `getCmsWorldMachineText` | [extended.yaml](../extended.yaml) |
| DELETE | `/api/cms/world-machine/texts/{textKey}/draft` | `discardWorldMachineTextDraft` | [extended.yaml](../extended.yaml) |
| PUT | `/api/cms/world-machine/texts/{textKey}/draft` | `saveWorldMachineTextDraft` | [extended.yaml](../extended.yaml) |
| POST | `/api/cms/world-machine/texts/{textKey}/publish` | `publishWorldMachineText` | [extended.yaml](../extended.yaml) |
| GET | `/api/presskit/archive/{snapshotId}` | `downloadPressKitArchive` | [extended.yaml](../extended.yaml) |
| GET | `/api/world-machine/texts` | `getWorldMachineTexts` | [extended.yaml](../extended.yaml) |

