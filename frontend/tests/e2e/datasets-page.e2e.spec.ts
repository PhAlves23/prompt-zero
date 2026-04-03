import { expect, test } from "@playwright/test"

test.describe("Página de datasets", () => {
  test("redireciona para login quando não autenticado", async ({ page }) => {
    await page.goto("/pt-BR/datasets", { waitUntil: "domcontentloaded" })
    await expect(page).toHaveURL(/\/pt-BR\/auth\/login/, { timeout: 30_000 })
  })
})
