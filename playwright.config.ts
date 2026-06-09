import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// Load test credentials from .env.e2e (gitignored, never commit real passwords)
config({ path: '.env.e2e' });

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: [['html', { open: 'always' }]],
    use: {
        baseURL: 'http://localhost:8081',
        trace: 'on-first-retry',
        screenshot: 'on',
        video: 'on',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:8081',
        reuseExistingServer: true,
        timeout: 120000,
    },
});
