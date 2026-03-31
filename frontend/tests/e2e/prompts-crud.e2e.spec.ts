import { expect, test } from "@playwright/test";

test.describe("CRUD de prompts (autenticado)", () => {
  test("listagem mostra ações e link para criar", async ({ page }) => {
    await page.goto("/pt-BR/prompts", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Prompts" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole("link", { name: "Criar prompt" })).toBeVisible();
  });

  test("criar prompt e aparecer na listagem", async ({ page }) => {
    const title = `E2E CRUD ${Date.now()}`;
    const content = "Conteúdo mínimo para validação E2E do fluxo CRUD de prompts na listagem.";

    await page.goto("/pt-BR/prompts/new", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Criar prompt" })).toBeVisible({
      timeout: 60_000,
    });

    await page.getByLabel("Título", { exact: true }).fill(title);
    await page.getByLabel("Conteúdo", { exact: true }).fill(content);

    const submitButton = page.locator("form[method='post']").getByRole("button", { name: "Criar prompt" });
    await expect(submitButton).toBeEnabled({ timeout: 10_000 });

    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes("/api/bff/prompts") &&
          !res.url().includes("/variables"),
        { timeout: 90_000 },
      ),
      submitButton.click(),
    ]);

    if (!response.ok()) {
      const body = await response.text().catch(() => "");
      throw new Error(`criar prompt falhou: HTTP ${response.status()} ${body.slice(0, 300)}`);
    }

    await expect(page).toHaveURL(/\/pt-BR\/prompts$/, { timeout: 60_000 });
    await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 60_000 });
  });

  test("abrir primeiro prompt da lista quando existir", async ({ page }, testInfo) => {
    await page.goto("/pt-BR/prompts", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Prompts" })).toBeVisible({
      timeout: 60_000,
    });

    const detailLinks = page
      .locator('a[href*="/pt-BR/prompts/"]')
      .filter({ hasNot: page.locator('[href$="/new"]') });
    if ((await detailLinks.count()) === 0) {
      testInfo.skip(true, "Sem prompts na listagem");
      return;
    }

    await detailLinks.first().click();
    await expect(page).toHaveURL(/\/pt-BR\/prompts\/[^/]+/, { timeout: 60_000 });
  });
});
