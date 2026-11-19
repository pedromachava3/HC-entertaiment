/**
 * Testes de integração da base de dados (PostgreSQL real).
 * Executam as migrações sobre uma base de dados descartável com uma simulação mínima
 * do ambiente Supabase (papéis anon/authenticated/service_role, auth.users, storage.buckets).
 *
 *   TEST_DATABASE_URL=postgres://postgres@127.0.0.1:54329/postgres npm run test:db
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import pg from "pg";

const ADMIN_URL = process.env.TEST_DATABASE_URL;
const DB = "hc_vitest";
const run = ADMIN_URL ? describe : describe.skip;

let pool: pg.Pool; // ligações como service_role (servidor)
let eventId: string;
let normalId: string;
let vipId: string;
let adminId: string;
let staffId: string;
let outsiderId: string;

const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const errCode = (e: unknown) => (e as Error).message;

async function createOrder(items: { ticket_type_id: string; quantity: number; [k: string]: unknown }[], opts: { key?: string; token?: string; event?: string } = {}) {
  const token = opts.token ?? randomUUID();
  const { rows } = await pool.query(
    "select * from public.create_order($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
    [opts.event ?? eventId, JSON.stringify(items), "Maria Joana Cossa", "+258841234567", null, "mpesa", hash(token), opts.key ?? randomUUID(), 2880, null],
  );
  return rows[0] as { order_id: string; order_code: string; total_cents: string; created: boolean };
}

async function report(orderId: string, ref: string) {
  const { rows } = await pool.query("select public.report_payment($1,'mpesa','+258841234567',$2,null,null) as id", [orderId, ref]);
  return rows[0].id as string;
}

async function review(subId: string, action: string, actor = adminId) {
  const { rows } = await pool.query("select * from public.review_payment($1,$2,$3,null,2880)", [subId, action, actor]);
  return rows[0] as { order_id: string; order_status: string; tickets_created: number };
}

run("base de dados", () => {
  beforeAll(async () => {
    const admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`drop database if exists ${DB}`);
    await admin.query(`create database ${DB}`);
    await admin.end();

    const url = new URL(ADMIN_URL!);
    url.pathname = `/${DB}`;
    const setup = new pg.Client({ connectionString: url.toString() });
    await setup.connect();
    await setup.query(readFileSync("tests/db/supabase-stubs.sql", "utf8"));
    for (const f of readdirSync("supabase/migrations").sort()) {
      await setup.query(readFileSync(`supabase/migrations/${f}`, "utf8"));
    }
    await setup.query(readFileSync("supabase/seed.sql", "utf8"));
    const users = await setup.query("insert into auth.users (email) values ('admin@hc.test'),('staff@hc.test'),('outro@hc.test') returning id");
    [adminId, staffId, outsiderId] = users.rows.map((r) => r.id);
    await setup.query("insert into public.user_roles (user_id, role) values ($1,'admin'),($2,'staff')", [adminId, staffId]);
    const ev = await setup.query("select id from public.events where slug = 'good-vibes-at-summer-2026'");
    eventId = ev.rows[0].id;
    const tt = await setup.query("select id, name from public.ticket_types where event_id = $1", [eventId]);
    normalId = tt.rows.find((r) => r.name === "Normal").id;
    vipId = tt.rows.find((r) => r.name === "VIP").id;
    await setup.end();

    pool = new pg.Pool({ connectionString: url.toString(), max: 20 });
    pool.on("connect", (c) => void c.query("set role service_role"));
  });

  afterAll(async () => {
    await pool?.end();
  });

  describe("checkout e preços", () => {
    it("Normal: 300 MT", async () => {
      const o = await createOrder([{ ticket_type_id: normalId, quantity: 1 }]);
      expect(Number(o.total_cents)).toBe(30000);
      expect(o.order_code).toMatch(/^HC-\d{4}-\d{6}$/);
    });
    it("VIP: 700 MT", async () => {
      const o = await createOrder([{ ticket_type_id: vipId, quantity: 1 }]);
      expect(Number(o.total_cents)).toBe(70000);
    });
    it("Compra mista 2 Normais + 1 VIP = 1.300 MT, com preços guardados", async () => {
      const o = await createOrder([{ ticket_type_id: normalId, quantity: 2 }, { ticket_type_id: vipId, quantity: 1 }]);
      expect(Number(o.total_cents)).toBe(130000);
      const { rows } = await pool.query("select ticket_type_name, unit_price_cents, quantity, line_total_cents from public.order_items where order_id=$1 order by sort_order", [o.order_id]);
      expect(rows.map((r) => [r.ticket_type_name, Number(r.unit_price_cents), r.quantity, Number(r.line_total_cents)])).toEqual([
        ["Normal", 30000, 2, 60000],
        ["VIP", 70000, 1, 70000],
      ]);
    });
    it("ignora preços adulterados enviados com os itens", async () => {
      const o = await createOrder([{ ticket_type_id: vipId, quantity: 1, price_cents: 1, unit_price: 1 }]);
      expect(Number(o.total_cents)).toBe(70000);
    });
    it("alterar o preço não afecta encomendas existentes", async () => {
      const o = await createOrder([{ ticket_type_id: normalId, quantity: 1 }]);
      await pool.query("update public.ticket_types set price_cents = 35000 where id=$1", [normalId]);
      const { rows } = await pool.query("select total_cents from public.orders where id=$1", [o.order_id]);
      expect(Number(rows[0].total_cents)).toBe(30000);
      await pool.query("update public.ticket_types set price_cents = 30000 where id=$1", [normalId]);
    });
    it("rejeita quantidades inválidas", async () => {
      await expect(createOrder([{ ticket_type_id: normalId, quantity: 0 }])).rejects.toThrow(/INVALID_QUANTITY/);
      await expect(createOrder([{ ticket_type_id: normalId, quantity: -2 }])).rejects.toThrow(/INVALID_QUANTITY/);
      await expect(createOrder([{ ticket_type_id: normalId, quantity: 11 }])).rejects.toThrow(/MAX_PER_TYPE_EXCEEDED/);
      await expect(createOrder([{ ticket_type_id: normalId, quantity: 6 }, { ticket_type_id: vipId, quantity: 6 }])).rejects.toThrow(/MAX_PER_ORDER_EXCEEDED/);
      await expect(createOrder([{ ticket_type_id: normalId, quantity: 1 }, { ticket_type_id: normalId, quantity: 1 }])).rejects.toThrow(/DUPLICATE_ITEM/);
      await expect(createOrder([])).rejects.toThrow(/EMPTY_ORDER/);
      await expect(createOrder([{ ticket_type_id: randomUUID(), quantity: 1 }])).rejects.toThrow(/TICKET_TYPE_NOT_FOUND/);
    });
    it("um erro não deixa inventário reservado", async () => {
      const before = await pool.query("select quantity_reserved from public.ticket_types where id=$1", [normalId]);
      await expect(createOrder([{ ticket_type_id: normalId, quantity: 3 }, { ticket_type_id: vipId, quantity: 99 }])).rejects.toThrow();
      const after = await pool.query("select quantity_reserved from public.ticket_types where id=$1", [normalId]);
      expect(after.rows[0].quantity_reserved).toBe(before.rows[0].quantity_reserved);
    });
    it("pedido repetido (mesma chave) devolve a mesma encomenda e não reserva duas vezes", async () => {
      const key = randomUUID();
      const token = "token-fixo-de-teste-1234567890";
      const before = await pool.query("select quantity_reserved from public.ticket_types where id=$1", [vipId]);
      const a = await createOrder([{ ticket_type_id: vipId, quantity: 2 }], { key, token });
      const b = await createOrder([{ ticket_type_id: vipId, quantity: 2 }], { key, token });
      expect(b.order_id).toBe(a.order_id);
      expect(b.created).toBe(false);
      const after = await pool.query("select quantity_reserved from public.ticket_types where id=$1", [vipId]);
      expect(after.rows[0].quantity_reserved - before.rows[0].quantity_reserved).toBe(2);
      await expect(createOrder([{ ticket_type_id: vipId, quantity: 2 }], { key, token: "outro-token" })).rejects.toThrow(/IDEMPOTENCY_CONFLICT/);
    });
    it("compras simultâneas nunca excedem a capacidade e geram códigos únicos", async () => {
      const ev = await pool.query("insert into public.events (slug,name,event_date,status,sales_status) values ('teste-capacidade','Teste capacidade','2099-01-01','published','open') returning id");
      const tt = await pool.query("insert into public.ticket_types (event_id,name,category,price_cents,quantity_total) values ($1,'VIP','vip',70000,5) returning id", [ev.rows[0].id]);
      const results = await Promise.allSettled(
        Array.from({ length: 15 }, () => createOrder([{ ticket_type_id: tt.rows[0].id, quantity: 1 }], { event: ev.rows[0].id })),
      );
      const ok = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ order_code: string }>[];
      const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
      expect(ok.length).toBe(5);
      expect(failed.every((f) => /SOLD_OUT/.test(errCode(f.reason)))).toBe(true);
      expect(new Set(ok.map((r) => r.value.order_code)).size).toBe(5);
      const { rows } = await pool.query("select quantity_reserved from public.ticket_types where id=$1", [tt.rows[0].id]);
      expect(rows[0].quantity_reserved).toBe(5);
    });
    it("eventos com vendas encerradas ou cancelados não aceitam compras", async () => {
      await pool.query("update public.events set sales_status='closed' where id=$1", [eventId]);
      await expect(createOrder([{ ticket_type_id: normalId, quantity: 1 }])).rejects.toThrow(/EVENT_NOT_ON_SALE/);
      await pool.query("update public.events set sales_status='open', status='cancelled' where id=$1", [eventId]);
      await expect(createOrder([{ ticket_type_id: normalId, quantity: 1 }])).rejects.toThrow(/EVENT_NOT_ON_SALE/);
      await pool.query("update public.events set status='published' where id=$1", [eventId]);
    });
    it("encomendas pendentes expiram e libertam o inventário", async () => {
      const o = await createOrder([{ ticket_type_id: vipId, quantity: 3 }]);
      const before = await pool.query("select quantity_reserved from public.ticket_types where id=$1", [vipId]);
      await pool.query("update public.orders set expires_at = now() - interval '1 minute' where id=$1", [o.order_id]);
      const { rows } = await pool.query("select public.expire_stale_orders() as n");
      expect(rows[0].n).toBeGreaterThanOrEqual(1);
      const after = await pool.query("select quantity_reserved from public.ticket_types where id=$1", [vipId]);
      expect(before.rows[0].quantity_reserved - after.rows[0].quantity_reserved).toBe(3);
      await expect(report(o.order_id, "EXPIRED001")).rejects.toThrow(/ORDER_CLOSED|ORDER_EXPIRED/);
    });
  });

  describe("pagamentos", () => {
    it("comunicação de pagamento não marca como paga", async () => {
      const o = await createOrder([{ ticket_type_id: normalId, quantity: 1 }]);
      await report(o.order_id, "MP-REF-0001");
      const { rows } = await pool.query("select status, paid_at from public.orders where id=$1", [o.order_id]);
      expect(rows[0].status).toBe("payment_reported");
      expect(rows[0].paid_at).toBeNull();
      const t = await pool.query("select count(*)::int n from public.tickets where order_id=$1", [o.order_id]);
      expect(t.rows[0].n).toBe(0);
      await expect(report(o.order_id, "MP-REF-0002")).rejects.toThrow(/ALREADY_REPORTED/);
    });
    it("impede a reutilização da mesma referência (incl. variações de formato)", async () => {
      const a = await createOrder([{ ticket_type_id: normalId, quantity: 1 }]);
      const b = await createOrder([{ ticket_type_id: normalId, quantity: 1 }]);
      await report(a.order_id, "ABC-123-XYZ");
      await expect(report(b.order_id, "abc 123 xyz")).rejects.toThrow(/DUPLICATE_REFERENCE/);
    });
    it("rejeição devolve a encomenda a 'aguarda pagamento' e liberta a referência", async () => {
      const o = await createOrder([{ ticket_type_id: normalId, quantity: 1 }]);
      const sub = await report(o.order_id, "REJ-0001");
      const r = await review(sub, "reject");
      expect(r.order_status).toBe("pending_payment");
      const sub2 = await report(o.order_id, "REJ-0001");
      expect(sub2).toBeTruthy();
    });
    it("funcionário de validação e utilizadores sem papel não podem confirmar", async () => {
      const o = await createOrder([{ ticket_type_id: normalId, quantity: 1 }]);
      const sub = await report(o.order_id, "FORB-0001");
      await expect(review(sub, "confirm", staffId)).rejects.toThrow(/FORBIDDEN/);
      await expect(review(sub, "confirm", outsiderId)).rejects.toThrow(/FORBIDDEN/);
    });
  });

  describe("emissão e validação de bilhetes", () => {
    let paidOrder: string;
    let ticketIds: string[];

    it("confirmação emite 1 bilhete por unidade (2 Normais + 1 VIP = 3), números únicos", async () => {
      const o = await createOrder([{ ticket_type_id: normalId, quantity: 2 }, { ticket_type_id: vipId, quantity: 1 }]);
      paidOrder = o.order_id;
      const sub = await report(o.order_id, "PAID-0001");
      const soldBefore = await pool.query("select id, quantity_sold, quantity_reserved from public.ticket_types where id in ($1,$2)", [normalId, vipId]);
      const r = await review(sub, "confirm");
      expect(r.order_status).toBe("paid");
      expect(r.tickets_created).toBe(3);
      const { rows } = await pool.query("select id, ticket_number, category, price_cents, status from public.tickets where order_id=$1 order by ticket_number", [o.order_id]);
      ticketIds = rows.map((t) => t.id);
      expect(rows.map((t) => t.category)).toEqual(["normal", "normal", "vip"]);
      expect(rows.map((t) => Number(t.price_cents))).toEqual([30000, 30000, 70000]);
      expect(new Set(rows.map((t) => t.ticket_number)).size).toBe(3);
      expect(rows.every((t) => t.status === "valid")).toBe(true);
      const soldAfter = await pool.query("select id, quantity_sold, quantity_reserved from public.ticket_types where id in ($1,$2)", [normalId, vipId]);
      const delta = (id: string) => soldAfter.rows.find((x) => x.id === id).quantity_sold - soldBefore.rows.find((x) => x.id === id).quantity_sold;
      expect(delta(normalId)).toBe(2);
      expect(delta(vipId)).toBe(1);
    });
    it("emissão idempotente: confirmações repetidas e simultâneas não criam bilhetes adicionais", async () => {
      const { rows } = await pool.query("select id from public.payment_submissions where order_id=$1", [paidOrder]);
      const again = await review(rows[0].id, "confirm");
      expect(again.tickets_created).toBe(0);
      const o = await createOrder([{ ticket_type_id: normalId, quantity: 2 }]);
      const sub = await report(o.order_id, "PAR-0001");
      const res = await Promise.all(Array.from({ length: 6 }, () => review(sub, "confirm")));
      expect(res.reduce((s, r) => s + r.tickets_created, 0)).toBe(2);
      const t = await pool.query("select count(*)::int n from public.tickets where order_id=$1", [o.order_id]);
      expect(t.rows[0].n).toBe(2);
    });
    it("bilhete válido → entrada registada → segunda leitura recusada", async () => {
      const l = await pool.query("select * from public.lookup_ticket($1,$2)", [ticketIds[0], staffId]);
      expect(l.rows[0].result).toBe("valid");
      expect(l.rows[0].holder_name).toBe("Maria Joana Cossa");
      const a = await pool.query("select * from public.admit_ticket($1,$2)", [ticketIds[0], staffId]);
      expect(a.rows[0].result).toBe("admitted");
      const b = await pool.query("select * from public.admit_ticket($1,$2)", [ticketIds[0], staffId]);
      expect(b.rows[0].result).toBe("already_used");
      const l2 = await pool.query("select * from public.lookup_ticket($1,$2)", [ticketIds[0], staffId]);
      expect(l2.rows[0].result).toBe("already_used");
      const log = await pool.query("select used_by from public.tickets where id=$1", [ticketIds[0]]);
      expect(log.rows[0].used_by).toBe(staffId);
    });
    it("leituras simultâneas: apenas uma entrada é aceite", async () => {
      const res = await Promise.all(Array.from({ length: 10 }, () => pool.query("select * from public.admit_ticket($1,$2)", [ticketIds[1], staffId])));
      const admitted = res.filter((r) => r.rows[0].result === "admitted").length;
      expect(admitted).toBe(1);
    });
    it("bilhete inexistente é inválido; cancelado é recusado", async () => {
      const x = await pool.query("select * from public.admit_ticket($1,$2)", [randomUUID(), staffId]);
      expect(x.rows[0].result).toBe("invalid");
      await expect(pool.query("select public.cancel_ticket($1,$2,'teste')", [ticketIds[2], staffId])).rejects.toThrow(/FORBIDDEN/);
      await pool.query("select public.cancel_ticket($1,$2,'Pedido do cliente')", [ticketIds[2], adminId]);
      const c = await pool.query("select * from public.admit_ticket($1,$2)", [ticketIds[2], staffId]);
      expect(c.rows[0].result).toBe("cancelled");
    });
    it("utilizador sem papel não valida bilhetes", async () => {
      await expect(pool.query("select * from public.admit_ticket($1,$2)", [ticketIds[1], outsiderId])).rejects.toThrow(/FORBIDDEN/);
    });
  });

  describe("segurança (RLS e permissões)", () => {
    async function asRole(role: "anon" | "authenticated", sub: string | null, sql: string, params: unknown[] = []) {
      const c = await pool.connect();
      try {
        await c.query("begin");
        await c.query(`set local role ${role}`);
        if (sub) await c.query("select set_config('request.jwt.claim.sub', $1, true)", [sub]);
        return await c.query(sql, params);
      } finally {
        await c.query("rollback");
        c.release();
      }
    }

    it("anónimos não lêem encomendas, comprovativos nem bilhetes", async () => {
      for (const t of ["orders", "order_items", "payment_submissions", "tickets", "payment_audit_logs", "user_roles"]) {
        await expect(asRole("anon", null, `select * from public.${t}`)).rejects.toThrow(/permission denied/);
      }
    });
    it("anónimos não executam funções sensíveis", async () => {
      await expect(asRole("anon", null, "select public.expire_stale_orders()")).rejects.toThrow(/permission denied/);
      await expect(asRole("anon", null, "select * from public.admit_ticket($1,$2)", [randomUUID(), staffId])).rejects.toThrow(/permission denied/);
      await expect(asRole("authenticated", staffId, "select * from public.review_payment($1,'confirm',$2,null,2880)", [randomUUID(), adminId])).rejects.toThrow(/permission denied/);
    });
    it("anónimos não alteram eventos nem preços", async () => {
      const r = await asRole("anon", null, "update public.ticket_types set price_cents = 1 returning id");
      expect(r.rowCount).toBe(0);
    });
    it("o público só vê eventos não-rascunho", async () => {
      await pool.query("insert into public.events (slug,name,event_date,status) values ('rascunho-secreto','Rascunho','2099-01-01','draft')");
      const r = await asRole("anon", null, "select slug from public.events");
      expect(r.rows.map((x) => x.slug)).not.toContain("rascunho-secreto");
      expect(r.rows.map((x) => x.slug)).toContain("good-vibes-at-summer-2026");
    });
    it("utilizadores autenticados sem papel de admin não vêem encomendas", async () => {
      const r = await asRole("authenticated", outsiderId, "select * from public.orders");
      expect(r.rowCount).toBe(0);
      const s = await asRole("authenticated", staffId, "select * from public.orders");
      expect(s.rowCount).toBe(0);
      const a = await asRole("authenticated", adminId, "select count(*)::int n from public.orders");
      expect(a.rows[0].n).toBeGreaterThan(0);
    });
    it("indicadores do painel", async () => {
      const { rows } = await pool.query("select public.dashboard_stats() s");
      expect(rows[0].s.payments_confirmed).toBeGreaterThanOrEqual(2);
      expect(rows[0].s.tickets_used).toBeGreaterThanOrEqual(2);
      expect(rows[0].s.tickets_cancelled).toBe(1);
    });
  });
});
