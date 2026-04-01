import { expect, test } from "@playwright/test";

test.describe("Smoke E2E", () => {
  test("deve redirecionar para rota com locale", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/(pt-BR|en-US|es-ES)\//, { timeout: 30000 });
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("deve abrir rota publica de explore", async ({ page }) => {
    await page.goto("/pt-BR/explore", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/pt-BR\/explore/, { timeout: 30000 });
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });
});
