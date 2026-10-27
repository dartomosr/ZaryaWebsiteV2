import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: true,
  use: { browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: [
    { command: 'npm run dev:web', url: 'http://127.0.0.1:5173', reuseExistingServer: false },
    { command: 'npm run dev:cms', url: 'http://127.0.0.1:5174', reuseExistingServer: false },
    { command: 'npm run dev:moderation', url: 'http://127.0.0.1:5175', reuseExistingServer: false },
  ],
});
