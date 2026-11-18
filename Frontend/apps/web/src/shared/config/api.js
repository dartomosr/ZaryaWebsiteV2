export function apiBaseUrl() {
  const configuredBase = import.meta.env.VITE_API_BASE_URL || '/api/';
  const baseUrl = new URL(configuredBase, window.location.origin).href;
  return baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
}
