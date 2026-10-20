-- ============================================================================
-- MAS30 PRODUCTORA DE EVENTOS - ESQUEMA DE BASE DE DATOS (SUPABASE / POSTGRES)
-- Proyecto: mastreinta (hpbwcewuekxfqlofwpzu)
-- ============================================================================
-- Instrucciones:
-- 1. En tu panel de Supabase (https://supabase.com/dashboard/project/hpbwcewuekxfqlofwpzu)
-- 2. Ve a "SQL Editor" -> "+ New query"
-- 3. Pega todo este archivo y presiona "Run"
-- ============================================================================

create extension if not exists "uuid-ossp";

-- 1. TABLA DE EVENTOS (MODO FLYER + DETALLE COMPLETO)
create table if not exists public.events (
  id text primary key,
  slug text unique not null,
  title text not null,
  subtitle text not null,
  category text not null default 'Fiestas',
  date text not null,
  date_label text default 'sáb. 31 oct.',
  short_date text default '31.10',
  time text not null,
  doors_open text default '23:30 hs',
  venue_name text not null,
  venue_address text not null,
  venue_city text not null,
  map_url text,
  flyer_url text not null,
  badge text default 'Entradas $10.000',
  featured boolean default true,
  hidden boolean default false,
  publish_at text,
  organizer_whatsapp text default '+5491155553030',
  instagram_url text default 'https://instagram.com/mas30.eventos',
  tiktok_url text,
  age_restriction text default '+30 Exclusivo (DNI físico obligatorio)',
  dress_code text default 'Elegante Nocturno',
  description text not null,
  highlights jsonb not null default '[]'::jsonb,
  lineup jsonb not null default '[]'::jsonb,
  ticket_tiers jsonb not null default '[]'::jsonb,
  status text not null default 'ACTIVO',
  created_at timestamptz default now()
);

-- 2. TABLA DE RESERVAS / VENTAS POR TRANSFERENCIA
create table if not exists public.orders (
  id text primary key,
  order_code text unique not null,
  event_id text not null,
  event_title text not null,
  event_date text not null,
  event_venue text not null,
  buyer_name text not null,
  buyer_dni text not null,
  buyer_email text not null,
  buyer_phone text not null,
  tier_id text not null,
  tier_name text not null,
  unit_price numeric not null default 10000,
  quantity integer not null,
  total_amount numeric not null,
  transfer_sender text,
  transfer_reference text,
  notes text,
  status text not null default 'PENDIENTE',
  approved_at timestamptz,
  approved_by_username text,
  approved_by_name text,
  created_at timestamptz default now()
);

-- 3. TABLA DE ENTRADAS INDIVIDUALES CON QR ÚNICO (1 FILA POR CADA ENTRADA)
create table if not exists public.tickets (
  id text primary key,
  qr_code text unique not null,
  order_id text not null,
  order_code text not null,
  event_id text not null,
  event_title text not null,
  event_date text not null,
  event_venue text not null,
  tier_name text not null,
  holder_name text not null,
  holder_dni text not null,
  ticket_number integer not null,
  total_in_order integer not null,
  unit_price numeric not null default 10000,
  generated_by_username text,
  generated_by_name text,
  status text not null default 'VALIDO',
  scanned_at timestamptz,
  scanned_by text,
  created_at timestamptz default now()
);

-- 4. TABLA DE PREGUNTAS EN EVENTOS Y CONSULTAS DE CONTACTO
create table if not exists public.inquiries (
  id text primary key,
  type text not null default 'PREGUNTA_EVENTO',
  event_id text,
  event_title text,
  name text not null,
  email text not null,
  phone text,
  message text not null,
  reply text,
  is_public boolean default false,
  status text not null default 'PENDIENTE',
  created_at timestamptz default now()
);

-- 5. CONFIGURACIÓN DE DATOS BANCARIOS DE LA PRODUCTORA
create table if not exists public.settings (
  id text primary key default 'mas30_config',
  bank_name text not null default 'Banco Galicia / Mercado Pago',
  account_holder text not null default 'MAS30 PRODUCCIONES S.A.S.',
  cbu text not null default '0070099920000018493022',
  alias text not null default 'MAS30.EVENTOS.PRO',
  cuit text not null default '30-71849201-9',
  whatsapp_support text not null default '+5491155553030',
  instagram_handle text not null default '@mas30.eventos',
  updated_at timestamptz default now()
);

-- ============================================================================
-- POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- ============================================================================
alter table public.events enable row level security;
alter table public.orders enable row level security;
alter table public.tickets enable row level security;
alter table public.inquiries enable row level security;
alter table public.settings enable row level security;

drop policy if exists "Acceso lectura pública eventos" on public.events;
drop policy if exists "Gestión eventos" on public.events;
drop policy if exists "Acceso órdenes" on public.orders;
drop policy if exists "Acceso tickets QR" on public.tickets;
drop policy if exists "Acceso consultas y preguntas" on public.inquiries;
drop policy if exists "Acceso configuración" on public.settings;

create policy "Acceso lectura pública eventos" on public.events for select using (true);
create policy "Gestión eventos" on public.events for all using (true) with check (true);
create policy "Acceso órdenes" on public.orders for all using (true) with check (true);
create policy "Acceso tickets QR" on public.tickets for all using (true) with check (true);
create policy "Acceso consultas y preguntas" on public.inquiries for all using (true) with check (true);
create policy "Acceso configuración" on public.settings for all using (true) with check (true);

-- ============================================================================
-- CARGA INICIAL DE LOS 4 PRÓXIMOS EVENTOS OFICIALES MAS30 ($10.000 ARS)
-- ============================================================================
insert into public.events (id, slug, title, subtitle, category, date, time, venue_name, venue_address, venue_city, flyer_url, badge, featured, description, ticket_tiers, status)
values
  (
    'evt-halloween-3110',
    'halloween-mas30-31-10',
    'HALLOWEEN',
    'La Noche de Brujas más épica +30 · Disfraces, Hits Retro & Fiesta',
    'Fiestas',
    '2026-10-31',
    '23:30 a 06:00 hs',
    'MAS30 CLUB · HALLOWEEN EDITION',
    'Av. Córdoba 4800, Palermo',
    'Buenos Aires',
    '/flyers/halloween.png',
    'Sábado 31/10 · Especial',
    true,
    '¡Preparate para vivir la noche más terroríficamente divertida del año! Este sábado 31 de octubre celebramos HALLOWEEN en MAS30.',
    '[{"id":"tier-halloween-general","name":"Entrada General · Halloween MAS30","description":"Acceso general para el Sábado 31/10. Incluye 1 código QR individual.","price":10000,"stock":400,"sold":142,"includes":["Acceso General +30","Código QR Individual de Puerta"]}]'::jsonb,
    'ACTIVO'
  ),
  (
    'evt-pena-mastreinta-0612',
    'la-pena-mastreinta-06-12',
    'La Peña MASTREINTA!',
    'Temática Argentina - Tropical · Cumbia, Cuarteto, Folklore & Fiesta al Sol y bajo las Estrellas',
    'Especiales',
    '2026-12-06',
    '19:00 a 03:30 hs',
    'ESPACIO AIRE LIBRE · MASTREINTA',
    'Av. del Libertador 4100, Palermo',
    'Buenos Aires',
    '/flyers/pena-mastreinta.png',
    'Domingo 06/12 · Argentina + Tropical',
    true,
    '¡Llega el evento más alegre y festivo de diciembre! El domingo 6 de diciembre estrenamos La Peña MASTREINTA! con temática Argentina - Tropical.',
    '[{"id":"tier-pena-general","name":"Entrada General · La Peña MASTREINTA!","description":"Acceso oficial para el Domingo 06/12 (Temática Argentina - Tropical). Incluye 1 código QR individual.","price":10000,"stock":450,"sold":118,"includes":["Acceso General +30","Código QR Individual de Puerta"]}]'::jsonb,
    'ACTIVO'
  ),
  (
    'evt-bye-bye-2026-2612',
    'bye-bye-2026-fiesta-fin-de-ano',
    'BYE BYE 2026!',
    'La Gran Fiesta de Fin de Año de MAS30 · Brindis, Confetti & Todos los Clásicos',
    'Especiales',
    '2026-12-26',
    '23:30 a 06:30 hs',
    'GRAN SALÓN MAS30 · FIN DE AÑO',
    'Av. Figueroa Alcorta 5500, Palermo',
    'Buenos Aires',
    '/flyers/bye-bye-2026.png',
    'Sábado 26/12 · Fin de Año',
    true,
    '¡Despedimos el 2026 como se merece! El sábado 26 de diciembre nos juntamos todos en BYE BYE 2026!, la fiesta de fin de año de MAS30.',
    '[{"id":"tier-byebye-general","name":"Entrada General · BYE BYE 2026!","description":"Acceso oficial a la fiesta de fin de año (Sábado 26/12). Incluye 1 código QR individual.","price":10000,"stock":500,"sold":180,"includes":["Acceso General +30","Copa de Brindis de Fin de Año","Código QR Individual de Puerta"]}]'::jsonb,
    'ACTIVO'
  ),
  (
    'evt-fiesta-calor-0901',
    'fiesta-calor-reggaeton-clasico-modo-clap',
    'FIESTA CALOR',
    'Reggaeton Clásico & Modo Clap! · Don Omar, Daddy Yankee, Wisin & Yandel y los hits del verano',
    'Fiestas',
    '2027-01-09',
    '23:30 a 06:00 hs',
    'CLUB CALOR · MAS30 SUMMER',
    'Av. Rafael Obligado 6150, Costanera',
    'Buenos Aires',
    '/flyers/fiesta-calor.png',
    'Sábado 09/01 · Verano',
    true,
    '¡Enero prende fuego la pista con FIESTA CALOR! Una edición especial de verano dedicada al Reggaeton Clásico de la vieja escuela y el bloque explosivo en MODO CLAP!',
    '[{"id":"tier-calor-general","name":"Entrada General · FIESTA CALOR","description":"Acceso oficial para el Sábado 09/01 (Reggaeton Clásico & Modo Clap!). Incluye 1 código QR individual.","price":10000,"stock":450,"sold":95,"includes":["Acceso General +30","Código QR Individual de Puerta"]}]'::jsonb,
    'ACTIVO'
  )
on conflict (id) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  date = excluded.date,
  time = excluded.time,
  flyer_url = excluded.flyer_url,
  ticket_tiers = excluded.ticket_tiers;
