-- =====================================================================
-- Dados iniciais HC Entertainment (eventos a partir dos cartazes oficiais).
-- Idempotente: pode ser executado mais do que uma vez.
-- NOTA: os anos de 10/12, 24/12 e 02/11 não constam dos cartazes e foram
-- deduzidos pelo dia da semana / sequência das edições — confirmar no painel.
-- NOTA: as quantidades de bilhetes (capacidade) NÃO foram fornecidas —
-- valores provisórios a ajustar pelo administrador antes de divulgar.
-- =====================================================================
do $$
declare
  r record;
  v_event uuid;
  v_img uuid;
begin
  for r in
    select * from (values
      ('reguadas-do-verao-2022', 'Reguadas do Verão — Edição Especial', '2022-12-10'::date, '14:00'::time, 'Claids Bar', 'Paragem Palhota, depois do ISTEG', null::text,
       'Produção: Deezy Jr, AZ & Makiado Produções. Apoio: HC Entertainment. Piscina aberta.',
       array['Lorki','Pisso','Ghost The Deejay','DJ Zuma','RK77','Henny','Elton & Guzman'],
       'Tickets 300 MT · Na porta 500 MT', 'completed', '/posters/2022-12-10-reguadas-do-verao', 'seed/posters/2022-12-10-reguadas-do-verao.webp', 1440, 1440, 199672),
      ('good-vibes-sunset-2023-12-02', 'Good Vibes Sunset', '2023-12-02'::date, '12:00'::time, 'Chillas Bar', 'Belo Horizonte, Campoane', null,
       'HC Entertainment apresenta Good Vibes Sunset. Vibe, pool, jogos e música.',
       array['Pisso','RK77','Droidz The DJ','Kevin Lamar','DJ Jasta','MC Edson Cerelac'],
       'Das 12h às 16h nome na lista · 17h às 20h consumo mínimo 500 MT · depois das 20h entrada 500 MT', 'completed', '/posters/2023-12-02-good-vibes-sunset', 'seed/posters/2023-12-02-good-vibes-sunset.webp', 1037, 1297, 77362),
      ('good-vibes-sunset-edicao-especial-2023-12-24', 'Good Vibes Sunset — Edição Especial', '2023-12-24'::date, '12:00'::time, 'Chillas Bar', 'Belo Horizonte, Campoane', null,
       'HC Entertainment apresenta Good Vibes Sunset — Edição Especial. Vibe, pool, jogos e música.',
       array['Pisso','RK77','Salgado','Ghost Friends','Zuma','Ricky'],
       'Consumo mínimo 500 MT das 12h às 22h · depois das 22h entrada 300 MT', 'completed', '/posters/2023-12-24-good-vibes-sunset-edicao-especial', 'seed/posters/2023-12-24-good-vibes-sunset-edicao-especial.webp', 1037, 1297, 148046),
      ('good-vibes-sunset-edicao-especial-2024-07-06', 'Good Vibes Sunset — Edição Especial', '2024-07-06'::date, null::time, 'Chillas Bar', 'Belo Horizonte, Campoane', null,
       'HC Entertainment apresenta Good Vibes Sunset — Edição Especial, com Edyfox e Ricky. Vibe, pool, jogos e música. 18+.',
       array['Edyfox','Ricky','Pisso','DJ Wilson','RK77','Marley DJ','Rani Bass','Double Secrets','Magroo','Maronz','Riva Mix','MC Edson Cerelac','DKY'],
       'Bilhete 200 MT · No local 500 MT', 'completed', '/posters/2024-07-06-good-vibes-sunset-edicao-especial', 'seed/posters/2024-07-06-good-vibes-sunset-edicao-especial.webp', 1170, 1463, 144404),
      ('exagero-the-summer-2024', 'Exagero The Summer', '2024-11-02'::date, '14:00'::time, 'Chillas Bar', 'Campoane', null,
       'HC Entertainment × Family450 apresentam Exagero The Summer. Piscina aberta.',
       array['Pisso','Pablo X','DJ Romm''s','RK77','DJ IP','Wilson DJ','Rani Bass','MC Edson Cerelac'],
       'Bilhete 200 MT · Porta 300 MT', 'completed', '/posters/2024-11-02-exagero-the-summer', 'seed/posters/2024-11-02-exagero-the-summer.webp', 1232, 1406, 156802),
      ('good-vibes-of-winter-2025', 'Good Vibes of Winter', '2025-08-30'::date, '14:00'::time, 'Chillas Bar', 'Campoane', null,
       'HC Entertainment apresenta Good Vibes of Winter — DJ Wivan Bday Bash. Pool, music, food, vibes. Welcome drink para as primeiras 50 pessoas.',
       array['DJ Wivan','DJ Skeet','Mvuleni Da DJ','DJ Obelix','Freddie The DJ','DJ Classik','MC Edson Cerelac','Angel Breezhy','Rani Bass','DJ Eddy Pro','DJ Tinga','DJ Pisso','DJ RK77','DJ Mavanga','DJ Zuma','Kelson e Nyson'],
       'Bilhete 300 MT · Na porta 500 MT', 'completed', '/posters/2025-08-30-good-vibes-of-winter', 'seed/posters/2025-08-30-good-vibes-of-winter.webp', 1440, 1723, 231766),
      ('good-vibes-sunset-2025-12-20', 'Good Vibes Sunset', '2025-12-20'::date, '12:00'::time, 'Chillas Bar', 'Belo Horizonte, Campoane', null,
       'HC Entertainment apresenta Good Vibes Sunset, com DJ Obelix & Ricky.',
       array['DJ Obelix','Ricky','Pisso DJ','RK77','Rani Bass','DJ Zulu','Edson Cerelac (host)'],
       '300 MT consumo mínimo (12h às 18h) · 500 MT depois das 18h', 'completed', '/posters/2025-12-20-good-vibes-sunset', 'seed/posters/2025-12-20-good-vibes-sunset.webp', 1340, 1683, 218064),
      ('good-vibes-at-summer-2026', 'Good Vibes at Summer', '2026-12-12'::date, '14:00'::time, 'Antigo Nozava', 'Belo Horizonte, uma paragem antes da Faculdade Unitiva', null,
       'HC Entertainment apresenta Good Vibes at Summer. Artistas convidados: Laylizzy e Djimetta, com um alinhamento de deejays convidados e MC Edson Cerelac.',
       array['Laylizzy','Djimetta','Shade','DJ Jasta','Pisso','Wizzx','JR Deep','Wivan','Kevin Lamar','Zulu','RK77','DJ Das Trevas','Classik','MC Edson Cerelac'],
       'Na porta: Normal 500 MT · VIP 1500 MT', 'published', '/posters/2026-12-12-good-vibes-at-summer', 'seed/posters/2026-12-12-good-vibes-at-summer.webp', 1600, 2000, 6213074)
    ) as t(slug, name, d, tm, venue, address, city, descr, lineup, door, status, dir, original, w, h, size)
  loop
    insert into public.events (slug, name, description, event_date, start_time, venue, address, city, lineup, door_info, status, sales_status)
    values (r.slug, r.name, r.descr, r.d, r.tm, r.venue, r.address, r.city, r.lineup, r.door, r.status::public.event_status,
            case when r.status = 'published' then 'open' else 'closed' end::public.sales_status)
    on conflict (slug) do nothing
    returning id into v_event;

    if v_event is not null then
      insert into public.event_images (event_id, kind, title, original_path, display_path, thumb_path, width, height, mime_type, size_bytes, show_in_gallery, sort_order)
      values (v_event, 'poster', r.name, r.original, r.dir || '/display.webp', r.dir || '/thumb.webp', r.w, r.h, 'image/webp', r.size, true, 0)
      returning id into v_img;
      update public.events set poster_image_id = v_img where id = v_event;

      if r.status = 'published' then
        insert into public.ticket_types (event_id, name, category, description, price_cents, quantity_total, max_per_order, sort_order)
        values
          (v_event, 'Normal', 'normal', null, 30000, 500, 10, 1),
          (v_event, 'VIP', 'vip', null, 70000, 100, 10, 2);
      end if;
    end if;
  end loop;
end $$;
