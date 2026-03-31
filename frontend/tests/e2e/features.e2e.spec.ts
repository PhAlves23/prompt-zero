import { expect, test } from "@playwright/test";

test.describe("Fluxos principais (autenticado)", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error("Browser console error:", msg.text());
      }
    });
    page.on("pageerror", (error) => {
      console.error("Page error:", error.message);
    });
  });

  test("dashboard carrega após login", async ({ page }) => {
    await page.goto("/pt-BR/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
      timeout: 60_000,
    });
  });

  test("lista de prompts e navegação para criar prompt", async ({ page }) => {
    await page.goto("/pt-BR/prompts", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Prompts" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText("Meus prompts")).toBeVisible();
    await page.getByRole("link", { name: "Criar prompt" }).click();
    await expect(page).toHaveURL(/\/pt-BR\/prompts\/new/);
    await expect(page.getByRole("heading", { name: "Criar prompt" })).toBeVisible();
  });

  test("criar prompt e voltar para a listagem", async ({ page }) => {
    const title = `E2E Prompt ${Date.now()}`;
    const content = "Conteúdo mínimo para validação E2E do fluxo de criação de prompt.";

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
        (res) => {
          const isMatch =
            res.request().method() === "POST" &&
            res.url().includes("/api/bff/prompts") &&
            !res.url().includes("/variables");
          if (isMatch) {
            console.log(`Matched response: ${res.url()} - ${res.status()}`);
          }
          return isMatch;
        },
        { timeout: 90_000 },
      ).catch(async (error) => {
        const screenshot = await page.screenshot();
        console.error("Failed to receive response. Current URL:", page.url());
        console.error("Screenshot captured:", screenshot.length, "bytes");
        throw error;
      }),
      submitButton.click(),
    ]);

    if (!response.ok()) {
      const body = await response.text().catch(() => "");
      throw new Error(`criar prompt falhou: HTTP ${response.status()} ${body.slice(0, 300)}`);
    }

    await expect(page).toHaveURL(/\/pt-BR\/prompts$/, { timeout: 60_000 });
    await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 60_000 });
  });

  test("explorar prompts públicos (lista ou vazio)", async ({ page }) => {
    await page.goto("/pt-BR/explore", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Explorar" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText("Explore prompts públicos")).toBeVisible();
    await expect(page.getByPlaceholder("Buscar prompts públicos")).toBeVisible();
    await expect(page.getByText(/\d+\s+resultados/)).toBeVisible({ timeout: 60_000 });
  });

  test("workspaces", async ({ page }) => {
    await page.goto("/pt-BR/workspaces", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Workspaces" })).toBeVisible({
      timeout: 60_000,
    });
  });

  test("tags", async ({ page }) => {
    await page.goto("/pt-BR/tags", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Tags" })).toBeVisible({
      timeout: 60_000,
    });
  });

  test("experimentos A/B", async ({ page }) => {
    await page.goto("/pt-BR/experiments", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Experimentos A/B" })).toBeVisible({
      timeout: 60_000,
    });
  });

  test("configurações", async ({ page }) => {
    await page.goto("/pt-BR/settings", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Configurações" })).toBeVisible({
      timeout: 60_000,
    });
  });
});
