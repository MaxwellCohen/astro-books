import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.FT_PORT || 4119);

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  workers: 1,
  timeout: 60_000,
  reporter: [['list'], ['json', { outputFile: process.env.FT_REPORT || '.out/report.json' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    launchOptions: { executablePath: process.env.CHROME_PATH || '/home/maxc/.local/bin/google-chrome' },
  },
  projects: [
    // Build-time features: run `astro build` with different env (no server needed).
    { name: 'build', testMatch: /(bundle-analysis|multi-host-deployment)\.spec\.ts/, timeout: 600_000 },
    // Runtime features: run against the production node server on PORT.
    { name: 'browser', testIgnore: /(bundle-analysis|multi-host-deployment)\.spec\.ts/ },
  ],
});
