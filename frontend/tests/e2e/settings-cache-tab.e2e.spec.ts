import { expect, test } from "@playwright/test"

test.describe("Configurações — aba Cache", () => {
  test("com sessão, aba Cache LLM é visível", async ({ page }) => {
    await page.goto("/pt-BR/settings?tab=cache", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("tab", { name: /cache/i })).toBeVisible({ timeout: 60_000 })
    await expect(
      page.getByText(/cache de respostas|response cache|caché de respuestas/i),
    ).toBeVisible({ timeout: 30_000 })
  })
})
