import { expect, test } from "@playwright/test";

test.describe("Smoke E2E", () => {
  test("deve redirecionar para rota com locale", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/(pt-BR|en-US|es-ES)\//);
    await expect(page.locator("body")).toBeVisible();
  });

  test("deve abrir rota publica de explore", async ({ page }) => {
    await page.goto("/pt-BR/explore");
    await expect(page).toHaveURL(/\/pt-BR\/explore/);
    await expect(page.locator("body")).toBeVisible();
  });
});
