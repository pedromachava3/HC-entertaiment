import { expect, test } from "@playwright/test";

/**
 * Fluxo completo com dados reais. Requer um ambiente configurado (Supabase) e:
 *   E2E_FULL=1 E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… E2E_EVENT_SLUG=…
 * Atenção: cria uma encomenda real — usar num ambiente de testes/preview.
 */
const full = process.env.E2E_FULL === "1";

test.describe("compra → pagamento → confirmação → validação", () => {
  test.skip(!full, "Defina E2E_FULL=1 e as credenciais de teste para executar.");

  test("compra mista de 1.300 MT com M-Pesa", async ({ page }) => {
    await page.goto(`/eventos/${process.env.E2E_EVENT_SLUG}`);
    await page.getByRole("link", { name: /Comprar bilhetes/i }).click();
    await page.getByRole("button", { name: "Aumentar Normal" }).click();
    await page.getByRole("button", { name: "Aumentar Normal" }).click();
    await page.getByRole("button", { name: "Aumentar VIP" }).click();
    await expect(page.getByLabel("Resumo da encomenda")).toContainText("1.300 MT");
    await page.getByRole("button", { name: /Continuar/ }).click();
    await page.getByLabel("Nome completo").fill("Teste Automático E2E");
    await page.getByLabel("Número de WhatsApp").fill("84 000 0000");
    await page.getByLabel("M-Pesa").check();
    await page.getByText("Li e aceito os").click();
    await page.getByText("Li e aceito a").click();
    await page.getByRole("button", { name: /Rever encomenda/ }).click();
    await page.getByRole("button", { name: /Confirmar encomenda/ }).click();
    await expect(page).toHaveURL(/\/encomenda\/HC-\d{4}-\d{6}\?k=/);
    await expect(page.getByText("AGUARDA PAGAMENTO")).toBeVisible();
    await expect(page.getByText("+258 84 542 5186")).toBeVisible();
    await expect(page.getByText("1.300 MT").first()).toBeVisible();

    await page.getByRole("button", { name: "JÁ EFECTUEI O PAGAMENTO" }).click();
    await page.getByLabel("Número utilizado na transferência").fill("84 000 0000");
    await page.getByLabel("Referência da transacção").fill(`E2E${Date.now()}`);
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText("PAGAMENTO COMUNICADO — EM VERIFICAÇÃO")).toBeVisible();
    const wa = page.getByRole("link", { name: "CONTACTAR HC ENTERTAINMENT" });
    await expect(wa).toHaveAttribute("href", /^https:\/\/wa\.me\/258845425186\?text=/);
  });
});
