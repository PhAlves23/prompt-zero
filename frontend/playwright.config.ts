import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

function useFullStack(): boolean {
  return process.env.CI === "true" || process.env.E2E_FULL_STACK === "1";
}

function reuseDevServer(): boolean {
  if (useFullStack()) {
    return false;
  }
  return true;
}

const authStatePath = path.join(process.cwd(), "tests/e2e/.auth/user.json");

/** Playwright exige `Record<string, string>` em `webServer.env` (não `ProcessEnv`). */
function stringEnv(source: NodeJS.ProcessEnv): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

/** Install/build precisam de devDependencies; o script exporta production só no `start:prod`. */
const backendEnv: Record<string, string> = {
  ...stringEnv(process.env),
  NODE_ENV: "development",
  PORT: "3001",
  FRONTEND_URL: "http://127.0.0.1:3000",
  DATABASE_URL:
    process.env.E2E_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:5432/promptzero",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? "e2e-access-secret",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? "e2e-refresh-secret",
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  ENCRYPTION_SECRET:
    process.env.ENCRYPTION_SECRET ?? "e2e-encryption-secret-32-chars-min!!",
};

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  globalSetup: useFullStack()
    ? path.join(process.cwd(), "tests/e2e/global-setup.ts")
    : undefined,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { open: "never" }],
      ]
    : [
        ["list"],
        ["html", { open: "never" }],
      ],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: useFullStack()
    ? [
        {
          command:
            'bash -c \'set -euo pipefail; export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"; cd ../backend && export NODE_ENV=development && yarn --frozen-lockfile && yarn prisma:generate && yarn prisma:migrate:deploy && yarn prisma:seed && yarn build && export NODE_ENV=production && exec yarn start:prod\'',
          url: "http://127.0.0.1:3001/api/v1",
          timeout: 360_000,
          reuseExistingServer: reuseDevServer(),
          env: backendEnv,
        },
        {
          command: "pnpm dev:e2e",
          url: "http://127.0.0.1:3000",
          timeout: 180_000,
          reuseExistingServer: reuseDevServer(),
          env: {
            ...stringEnv(process.env),
            BACKEND_API_URL: "http://127.0.0.1:3001/api/v1",
          },
        },
      ]
    : {
        command: "pnpm dev:e2e",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: reuseDevServer(),
        timeout: 120_000,
      },
  projects: useFullStack()
    ? [
        {
          name: "smoke",
          testMatch: /smoke\.spec\.ts/,
          use: { ...devices["Desktop Chrome"] },
        },
        {
          name: "features",
          testMatch: /features\.e2e\.spec\.ts/,
          use: {
            ...devices["Desktop Chrome"],
            storageState: authStatePath,
          },
        },
      ]
    : [
        {
          name: "smoke",
          testMatch: /smoke\.spec\.ts/,
          use: { ...devices["Desktop Chrome"] },
        },
      ],
});
