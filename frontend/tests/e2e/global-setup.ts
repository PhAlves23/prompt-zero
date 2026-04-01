import { request, type FullConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

function isE2EFullStack(): boolean {
  return process.env.CI === "true" || process.env.E2E_FULL_STACK === "1";
}

/** Evita corrida: o globalSetup pode correr logo após o check do webServer; o Nest ainda pode estar subindo. */
async function waitForBackendReady(maxMs: number): Promise<void> {
  const deadline = Date.now() + maxMs;
  const api = await request.newContext({ baseURL: "http://127.0.0.1:3001" });
  let lastError: Error | undefined;
  
  try {
    console.log("[E2E Global Setup] Aguardando backend ficar pronto...");
    while (Date.now() < deadline) {
      try {
        const res = await api.get("/api/v1", { timeout: 5_000 });
        if (res.ok()) {
          console.log("[E2E Global Setup] Backend pronto!");
          return;
        }
        lastError = new Error(`Backend retornou status ${res.status()}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    const elapsed = Math.round((Date.now() - (deadline - maxMs)) / 1000);
    throw new Error(
      `Backend em http://127.0.0.1:3001/api/v1 nao ficou pronto em ${elapsed}s. ` +
      `Ultimo erro: ${lastError?.message}`
    );
  } finally {
    await api.dispose();
  }
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  if (!isE2EFullStack()) {
    console.log("[E2E Global Setup] Modo smoke-only (sem backend), pulando setup");
    return;
  }

  const baseURL =
    (config.projects[0]?.use?.baseURL as string | undefined) ?? "http://127.0.0.1:3000";

  const authDir = path.join(process.cwd(), "tests/e2e/.auth");
  const authFile = path.join(authDir, "user.json");
  fs.mkdirSync(authDir, { recursive: true });

  console.log("[E2E Global Setup] Aguardando backend...");
  await waitForBackendReady(360_000);

  console.log("[E2E Global Setup] Tentando login em", baseURL);
  const ctx = await request.newContext({ baseURL });
  
  try {
    const loginRes = await ctx.post("/api/session/login", {
      data: {
        email: "admin@promptvault.com",
        password: "Password@123",
      },
      headers: { "Content-Type": "application/json" },
      timeout: 30_000,
    });

    if (!loginRes.ok()) {
      const body = await loginRes.text();
      throw new Error(`E2E global-setup: login falhou (${loginRes.status()}): ${body}`);
    }

    console.log("[E2E Global Setup] Login bem-sucedido, salvando estado...");
    await ctx.storageState({ path: authFile });
    console.log("[E2E Global Setup] Setup completo!");
  } finally {
    await ctx.dispose();
  }
}
