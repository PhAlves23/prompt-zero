import { expect, test } from "@playwright/test";

test.describe("Fluxo de autenticação", () => {
  test.describe("sem sessão", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("página de login exibe email, senha e botão de entrar", async ({ page }) => {
      await page.goto("/pt-BR/auth/login", { waitUntil: "domcontentloaded" });
      await expect(page.getByLabel(/e-mail|email/i)).toBeVisible({ timeout: 60_000 });
      await expect(page.getByLabel(/senha|password/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /entrar|sign in|log in/i })).toBeVisible();
    });

    test("página de registro exibe campos principais", async ({ page }) => {
      await page.goto("/pt-BR/auth/register", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible({
        timeout: 60_000,
      });
    });

    test("login com credenciais inválidas permanece na página de login", async ({ page }) => {
      await page.goto("/pt-BR/auth/login", { waitUntil: "domcontentloaded" });
      await page.getByLabel(/e-mail|email/i).fill("naoexiste@example.com");
      await page.getByLabel(/senha|password/i).fill("wrongpassword");
      await page.getByRole("button", { name: /entrar|sign in|log in/i }).click();
      await expect(page).toHaveURL(/\/pt-BR\/auth\/login/, { timeout: 15_000 });
    });
  });

  test("com sessão (storageState), dashboard é acessível", async ({ page }) => {
    await page.goto("/pt-BR/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
      timeout: 60_000,
    });
  });
});
