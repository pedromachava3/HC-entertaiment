# HC Entertainment — Plataforma de Eventos e Bilhética Digital

**Hot Crazy Entertainment** · Matola, Moçambique · *A FESTA COMEÇA AQUI.*

Website público (eventos, galeria, compra de bilhetes) + painel administrativo (eventos, pagamentos,
bilhetes, galeria, validação de entradas). Pagamentos por **M-Pesa** e **e-Mola** com **confirmação manual**,
emissão automática de **bilhetes PDF com QR Code** e validação à entrada.

```
VISITAR WEBSITE → ESCOLHER EVENTO → COMPRAR BILHETES → PAGAR POR M-PESA OU E-MOLA → COMUNICAR PAGAMENTO
→ CONFIRMAÇÃO ADMINISTRATIVA → GERAR PDF COM QR CODE → ENVIAR POR WHATSAPP → VALIDAR ENTRADA
```

## Tecnologias

| Camada | Escolha |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4, componentes ao estilo shadcn/ui, Lucide |
| Backend | Route Handlers + Server Actions, validação Zod 4 |
| Dados | Supabase PostgreSQL + Auth + Storage, RLS, migrações SQL versionadas |
| Bilhetes | `qrcode` (QR), `pdf-lib` (PDF no servidor), HMAC-SHA256 nos QR |
| Imagens | `sharp` (orientação EXIF, WebP, miniaturas — original preservado) |
| Leitura de QR | câmara do telemóvel + `jsqr` |
| Testes | Vitest (unitários + integração PostgreSQL), Playwright (E2E), ESLint |
| Alojamento | Vercel (região `fra1`, Cron diário) |

## Estrutura

```
src/
  app/
    (site)/            páginas públicas: /, /eventos, /eventos/[slug], /galeria, /sobre, /contactos,
                       /checkout/[eventId], /encomenda/[referencia], /termos, /privacidade, /reembolsos, /acesso
    admin/             /admin/login, auth (callback, convites), (panel)/ dashboard, eventos, pagamentos,
                       bilhetes, galeria, validacao, utilizadores, conta; actions.ts (server actions)
    api/               orders, orders/[code]/payment|pdf, admin/*, cron/expire-orders
  components/          ui/, site/, admin/
  lib/                 config, validação, formatação, WhatsApp, QR/PDF, serviços, acesso a dados, Supabase
  proxy.ts             renovação de sessão nas rotas /admin
supabase/
  migrations/          esquema, funções transaccionais, RLS + buckets
  seed.sql             eventos iniciais (a partir dos cartazes)
seed/posters/          cartazes originais (intactos)
public/posters/        versões web dos cartazes iniciais (geradas por scripts/build-seed-posters.mjs)
tests/                 unit/, db/, e2e/
```

## Instalação local

```bash
npm install
cp .env.example .env.local     # preencher os valores
npm run dev                    # http://localhost:3000
```

### Base de dados (Supabase)

1. Crie um projecto Supabase.
2. Aplique as migrações por ordem (`supabase/migrations/*.sql`) no SQL Editor ou com `supabase db push`.
3. Execute `supabase/seed.sql` para criar os eventos iniciais (idempotente).
4. Em **Authentication → URL Configuration**, defina *Site URL* com o domínio do site e acrescente
   `https://<domínio>/admin/auth/callback` e `https://<domínio>/admin/auth/confirm` às *Redirect URLs*.

### Primeiro administrador (sem palavras-passe fixas)

```bash
NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… NEXT_PUBLIC_SITE_URL=… \
  npm run admin:create -- email@exemplo.com admin
```

A pessoa recebe um convite por email, entra e define a sua palavra-passe em **/admin/conta**.
Alternativa: criar o utilizador no painel do Supabase e executar
`insert into public.user_roles (user_id, role) select id, 'admin' from auth.users where email = '…';`.
Os restantes utilizadores (administradores ou funcionários de validação) são geridos em **/admin/utilizadores**.

## Variáveis de ambiente

| Variável | Onde | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | público | URL do site |
| `NEXT_PUBLIC_SUPABASE_URL` | público | URL do projecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público | chave pública (anon/publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | **segredo** | só no servidor; sem ela as compras e o painel não funcionam |
| `TICKET_SIGNING_SECRET` | **segredo** | assina os QR Codes (≥ 32 caracteres). Não alterar depois de emitir bilhetes |
| `CRON_SECRET` | **segredo** | protege `/api/cron/expire-orders` |
| `ORDER_PENDING_TTL_MINUTES` | servidor | prazo de pagamento (padrão 2880 = 48 h) |

## Scripts

| Comando | Função |
|---|---|
| `npm run dev` / `build` / `start` | desenvolvimento, build de produção, servidor |
| `npm run lint` / `typecheck` | ESLint / TypeScript strict |
| `npm test` | testes unitários (Vitest) |
| `TEST_DATABASE_URL=postgres://… npm run test:db` | integração em PostgreSQL real (cria uma BD descartável) |
| `npm run test:e2e` | Playwright (local; `E2E_BASE_URL=https://… npm run test:e2e` para produção) |
| `npm run audit` | auditoria de dependências de produção |
| `npm run seed:posters` | regenera as versões web dos cartazes em `seed/posters` |
| `npm run admin:create -- email [admin\|staff]` | cria/atribui papéis |

## Publicação (GitHub + Vercel)

1. Envie o repositório para o GitHub (`git push`).
2. Na Vercel: **Add New → Project → Import** do repositório (framework Next.js detectado automaticamente).
3. Configure as variáveis de ambiente acima para *Production* e *Preview*.
4. Deploy. Cada `push` gera um deploy de preview; o ramo `main` publica em produção.
5. Domínio próprio: **Project → Settings → Domains** (HTTPS automático) e actualize `NEXT_PUBLIC_SITE_URL`
   e os URLs de redireccionamento do Supabase.

## Como funcionam os pagamentos (versão actual: confirmação manual)

1. O servidor cria a encomenda (código `HC-AAAA-NNNNNN`, gerado na BD sem repetições) com os preços **lidos da BD**.
2. O cliente transfere para **M-Pesa +258 84 542 5186** ou **e-Mola +258 87 885 2846** e comunica a referência.
3. O estado passa a **PAGAMENTO COMUNICADO — EM VERIFICAÇÃO**. Nada é emitido nesta fase.
4. O administrador verifica no M-Pesa/e-Mola e escolhe **Confirmar Pagamento**, **Manter Pendente** ou **Rejeitar Comprovativo**.
5. A confirmação emite os bilhetes numa transacção idempotente e gera o PDF (bucket privado).
6. O administrador descarrega o PDF, abre o WhatsApp do cliente, anexa e envia, e marca **Enviado**.

A arquitectura está preparada para integração futura com um fornecedor oficial (M-Pesa API / e-Mola / WhatsApp Business
Platform): a confirmação passa por `reviewPayment()` em `src/lib/services/payments.ts`, que pode ser chamada por um
webhook verificado em vez de um administrador.

## Segurança (resumo)

- RLS em todas as tabelas; anónimos não têm privilégios sobre encomendas, comprovativos ou bilhetes.
- Operações sensíveis em funções `SECURITY DEFINER` executáveis apenas pelo servidor (`service_role`), com verificação de papéis.
- Consulta de encomendas exige chave secreta de 256 bits (só o hash é guardado) — o código sequencial não basta.
- QR Code = ID + assinatura HMAC; sem dados pessoais; validado no servidor e na BD; entrada registada com `UPDATE` atómico.
- Uploads validados pelo conteúdo real (bytes), limite de tamanho, buckets privados e URLs assinados de curta duração.
- Limitação de frequência persistente (PostgreSQL), protecção CSRF (origem), cabeçalhos CSP/HSTS/X-Frame-Options.
- Sem palavras-passe fixas; convites por email; papéis `admin` e `staff` (validação apenas).

## Pendências que dependem da HC Entertainment

- Aprovar/rever os textos legais (cláusulas marcadas **[A aprovar]**).
- Definir capacidades reais por categoria (o seed usa valores provisórios: Normal 500, VIP 100) e benefícios VIP.
- Confirmar os anos dos eventos de 10/12, 24/12 e 02/11 (deduzidos pelo dia da semana — editáveis no painel).
