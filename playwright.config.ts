import { defineConfig, devices } from "@playwright/test";

const appURL = "http://127.0.0.1:3100";
const databaseURL = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (
  !databaseURL ||
  !["127.0.0.1", "localhost", "[::1]"].includes(
    new URL(databaseURL).hostname,
  ) ||
  !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  !process.env.SUPABASE_SECRET_KEY
) {
  throw new Error(
    "Configure as credenciais do Supabase local antes de rodar o E2E.",
  );
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  forbidOnly: Boolean(process.env.CI),
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: appURL,
    timezoneId: "America/Recife",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "Chromium mobile",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 360, height: 800 },
      },
    },
  ],
  webServer: {
    command:
      "npm run build -- --webpack && node --import ./e2e/musicbrainz-fixture.mjs ./node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3100",
    url: `${appURL}/cadastrar`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: { MUSICBRAINZ_USER_AGENT: "SoundAtlas-E2E/1.0 (fixture@example.com)" },
  },
});
