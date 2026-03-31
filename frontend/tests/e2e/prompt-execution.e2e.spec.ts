import { expect, test } from "@playwright/test";

test.describe("Execução de prompt (UI)", () => {
  test("detalhe do prompt exibe card de execução com CTA", async ({ page }) => {
    await page.goto("/pt-BR/prompts", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Prompts" })).toBeVisible({
      timeout: 60_000,
    });

    const detailLinks = page
      .locator('a[href*="/pt-BR/prompts/"]')
      .filter({ hasNot: page.locator('[href$="/new"]') });
    await expect(detailLinks.first()).toBeVisible({ timeout: 30_000 });
    await detailLinks.first().click();

    await expect(page).toHaveURL(/\/pt-BR\/prompts\/[^/]+/, { timeout: 60_000 });

    await expect(page.getByText("Executar prompt", { exact: false })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole("button", { name: "Executar" })).toBeVisible();
  });
});
