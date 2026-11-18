/* Swagger читает единственную каноническую сборку. Запросы к API здесь не исполняются. */
if (typeof SwaggerUIBundle === 'undefined') {
  document.getElementById('load-status').textContent = 'CDN Swagger UI недоступен. Проверьте доступ к cdn.jsdelivr.net или откройте openapi.yaml в совместимом локальном редакторе.';
} else {
  SwaggerUIBundle({
    url: '../openapi.yaml',
    dom_id: '#swagger-ui',
    validatorUrl: null,
    supportedSubmitMethods: [],
    persistAuthorization: false,
    filter: true,
    displayOperationId: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 0,
    onComplete() {
      document.getElementById('load-status').textContent = 'Swagger UI загружен. Контракт PROPOSED; наличие схемы не подтверждает реализацию API.';
    },
  });
}
