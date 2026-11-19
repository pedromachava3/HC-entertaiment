import { expect, test } from "@playwright/test";

/** Testes que não dependem de dados: navegação, responsividade, políticas, segurança. */

test("página inicial: hero, slogan, navegação e WhatsApp oficial", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("HC");
  await expect(page.getByText("A FESTA COMEÇA AQUI.").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Explorar Eventos/i })).toBeVisible();
  const wa = page.locator('a[href="https://wa.me/258845425186"]').first();
  await expect(wa).toHaveAttribute("href", "https://wa.me/258845425186");
});

test("menu principal funciona em computador e telemóvel", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await page.getByRole("navigation", { name: "Menu móvel" }).getByRole("link", { name: "Galeria" }).click();
  } else {
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Galeria" }).click();
  }
  await expect(page).toHaveURL(/\/galeria$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Galeria/i);
});

for (const [path, title] of [
  ["/eventos", /Eventos/],
  ["/sobre", /Hot Crazy/],
  ["/contactos", /Fale connosco/],
  ["/termos", /Termos/],
  ["/privacidade", /Privacidade/],
  ["/reembolsos", /Reembolsos/],
  ["/acesso", /Acesso/],
] as const) {
  test(`página ${path} abre sem erros`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    expect(errors).toEqual([]);
  });
}

test("sem scroll horizontal no telemóvel", async ({ page, isMobile }) => {
  test.skip(!isMobile);
  for (const p of ["/", "/eventos", "/contactos", "/termos"]) {
    await page.goto(p);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, p).toBeLessThanOrEqual(1);
  }
});

test("políticas assinalam cláusulas por aprovar", async ({ page }) => {
  await page.goto("/termos");
  await expect(page.getByText("[A aprovar]").first()).toBeVisible();
});

test("rota inexistente devolve 404", async ({ page }) => {
  const res = await page.goto("/nao-existe-xyz");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Página não encontrada")).toBeVisible();
});

test("encomenda sem chave não revela dados", async ({ page }) => {
  await page.goto("/encomenda/HC-2026-000001");
  await expect(page.getByRole("heading", { name: /Encomenda não encontrada/i })).toBeVisible();
});

test("área administrativa exige autenticação", async ({ page }) => {
  for (const p of ["/admin", "/admin/pagamentos", "/admin/validacao"]) {
    await page.goto(p);
    if (process.env.E2E_BASE_URL) {
      await expect(page).toHaveURL(/\/admin\/login/);
    } else {
      // Sem Supabase configurado (ambiente local de teste): o painel não mostra nada.
      await expect(page.getByText(/admin\/login|Configure as variáveis/).or(page.getByRole("heading", { name: "Área reservada" }))).toBeVisible();
    }
  }
});

test.describe("segurança dos endpoints", () => {
  test("API de encomendas recusa pedidos de outra origem", async ({ request }) => {
    const r = await request.post("/api/orders", { data: {}, headers: { origin: "https://atacante.example" } });
    expect(r.status()).toBe(403);
  });
  test("APIs administrativas recusam pedidos sem sessão", async ({ request, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    expect((await request.post("/api/admin/validate", { data: { payload: "x", action: "admit" }, headers: { origin } })).status()).toBe(401);
    expect((await request.post("/api/admin/uploads/sign", { data: {}, headers: { origin } })).status()).toBe(403);
    expect((await request.get("/api/admin/proofs/00000000-0000-4000-8000-000000000000")).status()).toBeGreaterThanOrEqual(300);
    expect((await request.get("/api/cron/expire-orders")).status()).toBe(401);
  });
  test("cabeçalhos de segurança presentes", async ({ request }) => {
    const r = await request.get("/");
    const h = r.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-powered-by"]).toBeUndefined();
  });
  test("link de encomenda não envia Referer", async ({ request }) => {
    const r = await request.get("/encomenda/HC-2026-000001?k=abc");
    expect(r.headers()["referrer-policy"]).toBe("no-referrer");
  });
});

test("SEO técnico: robots, sitemap e metadados", async ({ page, request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  await page.goto("/");
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-MZ");
});
