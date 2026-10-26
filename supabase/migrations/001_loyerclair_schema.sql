-- ============================================================================
-- LoyerClair — Migration 001 : Schéma complet, RLS strict, fonctions RPC atomiques
-- Cible : Supabase Postgres (Bénin — Collecte de loyers Mobile Money FCFA)
-- ============================================================================

create extension if not exists "pgcrypto";

-- Séquence globale pour les numéros de reçus officiels (REC-YYYY-NNNNNN)
create sequence if not exists public.receipt_seq start 1;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- 1.1 Profiles (liés à auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  full_name text not null default '',
  role text not null default 'landlord' check (role in ('landlord', 'tenant', 'admin')),
  locale text not null default 'fr' check (locale in ('fr', 'fon', 'yo')),
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.2 Organizations (Portefeuille / Agence / Propriétaire)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  payout_phone text not null default '+229 97 00 00 00',
  payout_operator text not null default 'mtn' check (payout_operator in ('mtn', 'moov', 'celtiis')),
  reminder_settings jsonb not null default '{
    "j_minus_3": true,
    "j_day": true,
    "j_plus_1": true,
    "j_plus_3": true,
    "j_plus_7": true,
    "weekly_summary": true,
    "template_before": "Bonjour {nom}, rappel amical : votre loyer de {montant} FCFA ({logement}) arrive à échéance le {date}. Réglez en 1 clic : {lien}",
    "template_day": "Bonjour {nom}, votre loyer de {montant} FCFA ({logement}) est dû aujourd''hui ({periode}). Payez par MTN/Moov/Celtiis ici : {lien}",
    "template_late": "Bonjour {nom}, votre loyer de {montant} FCFA ({logement}, {periode}) est en attente de règlement. Réglez dès maintenant pour recevoir votre reçu officiel : {lien}"
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.3 Properties (Immeubles / Maisons / Résidences)
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  city text not null default 'Cotonou',
  neighborhood text not null default '',
  address text not null default '',
  units_count integer not null default 1 check (units_count >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.4 Units (Lots / Appartements / Studios / Villas)
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  rent_amount integer not null check (rent_amount > 0),
  due_day integer not null default 5 check (due_day between 1 and 28),
  created_at timestamptz not null default now()
);

-- 1.5 Tenants (Locataires + lien d'invitation unique /t/[token])
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  phone text not null,
  unit_label text not null,
  rent_amount integer not null check (rent_amount > 0),
  due_day integer not null default 5 check (due_day between 1 and 28),
  invite_token text unique not null default encode(extensions.gen_random_bytes(12), 'hex'),
  invite_claimed_at timestamptz,
  notify_whatsapp boolean not null default true,
  notify_sms boolean not null default true,
  opt_out_reminders boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.6 Rent Periods (Échéances mensuelles)
create table if not exists public.rent_periods (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  period_month text not null check (period_month ~ '^[0-9]{4}-[0-9]{2}$'),
  period_label text not null,
  amount_due integer not null check (amount_due > 0),
  amount_paid integer not null default 0 check (amount_paid >= 0),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'partial', 'paid', 'late')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, period_month)
);

-- 1.7 Payments (Transactions Mobile Money ou Espèces)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  rent_period_id uuid not null references public.rent_periods(id) on delete cascade,
  amount integer not null check (amount > 0),
  fee_amount integer not null default 0 check (fee_amount >= 0),
  net_amount integer not null default 0 check (net_amount >= 0),
  currency text not null default 'XOF' check (currency = 'XOF'),
  operator text not null check (operator in ('mtn', 'moov', 'celtiis', 'cash')),
  payer_phone text,
  provider text not null default 'mock' check (provider in ('mock', 'fedapay', 'cash')),
  provider_ref text unique,
  provider_tx_id text,
  checkout_url text,
  idempotency_key text unique,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'canceled')),
  raw_webhook jsonb,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.8 Receipts (Reçus officiels numérotés avec QR vérifiable)
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_no text unique not null,
  verification_code text unique not null,
  payment_id uuid unique not null references public.payments(id) on delete restrict,
  org_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  rent_period_id uuid not null references public.rent_periods(id) on delete cascade,
  tenant_name text not null,
  tenant_phone text not null default '',
  property_name text not null,
  unit_label text not null,
  landlord_name text not null,
  period_label text not null,
  amount integer not null check (amount > 0),
  operator_label text not null,
  qr_payload text not null,
  pdf_url text,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 1.9 Reminder Logs (Historique des relances WhatsApp / SMS)
create table if not exists public.reminder_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  rent_period_id uuid references public.rent_periods(id) on delete cascade,
  stage text not null check (stage in ('J-3', 'J', 'J+1', 'J+3', 'J+7', 'manual', 'weekly_summary')),
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'sms')),
  recipient_phone text not null,
  message text not null,
  status text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  sent_at timestamptz not null default now()
);

-- 1.10 OTP Challenges (Authentification sans mot de passe & rate-limiting)
create table if not exists public.otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  purpose text not null default 'login',
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  ip_hash text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================
create index if not exists idx_organizations_owner on public.organizations(owner_id);
create index if not exists idx_properties_owner on public.properties(owner_id);
create index if not exists idx_tenants_owner on public.tenants(owner_id);
create index if not exists idx_tenants_invite_token on public.tenants(invite_token);
create index if not exists idx_tenants_user_id on public.tenants(user_id);
create index if not exists idx_rent_periods_owner on public.rent_periods(owner_id);
create index if not exists idx_rent_periods_tenant on public.rent_periods(tenant_id);
create index if not exists idx_rent_periods_status on public.rent_periods(status, due_date);
create index if not exists idx_payments_owner on public.payments(owner_id);
create index if not exists idx_payments_status_created on public.payments(status, created_at);
create index if not exists idx_payments_provider_ref on public.payments(provider_ref);
create index if not exists idx_receipts_owner on public.receipts(owner_id);
create index if not exists idx_receipts_tenant on public.receipts(tenant_id);
create index if not exists idx_receipts_no on public.receipts(receipt_no);
create index if not exists idx_receipts_verification on public.receipts(verification_code);
create index if not exists idx_otp_challenges_phone on public.otp_challenges(phone, created_at desc);

-- ============================================================================
-- 3. TRIGGER AUTO-CRÉATION PROFILE SUR AUTH.USERS
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone, full_name, role)
  values (
    new.id,
    coalesce(new.phone, new.raw_user_meta_data->>'phone', new.email, new.id::text),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'landlord')
  )
  on conflict (id) do update
  set
    phone = coalesce(excluded.phone, public.profiles.phone),
    full_name = case when excluded.full_name <> '' then excluded.full_name else public.profiles.full_name end,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS STRICT)
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.tenants enable row level security;
alter table public.rent_periods enable row level security;
alter table public.payments enable row level security;
alter table public.receipts enable row level security;
alter table public.reminder_logs enable row level security;
alter table public.otp_challenges enable row level security;

-- 4.1 Profiles : uniquement soi-même
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- 4.2 Organizations : propriétaire uniquement
drop policy if exists "organizations_owner_all" on public.organizations;
create policy "organizations_owner_all" on public.organizations
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- 4.3 Properties : propriétaire uniquement
drop policy if exists "properties_owner_all" on public.properties;
create policy "properties_owner_all" on public.properties
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- 4.4 Units : propriétaire uniquement
drop policy if exists "units_owner_all" on public.units;
create policy "units_owner_all" on public.units
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- 4.5 Tenants : propriétaire (CRUD complet) + locataire lié (lecture et opt-out)
drop policy if exists "tenants_owner_all" on public.tenants;
create policy "tenants_owner_all" on public.tenants
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "tenants_self_select" on public.tenants;
create policy "tenants_self_select" on public.tenants
  for select to authenticated
  using (user_id = auth.uid());

-- 4.6 Rent Periods : propriétaire (CRUD) + locataire lié (SELECT)
drop policy if exists "rent_periods_owner_all" on public.rent_periods;
create policy "rent_periods_owner_all" on public.rent_periods
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "rent_periods_tenant_select" on public.rent_periods;
create policy "rent_periods_tenant_select" on public.rent_periods
  for select to authenticated
  using (
    exists (
      select 1 from public.tenants t
      where t.id = rent_periods.tenant_id
        and t.user_id = auth.uid()
    )
  );

-- 4.7 Payments : propriétaire (SELECT/INSERT) + locataire lié (SELECT)
drop policy if exists "payments_owner_all" on public.payments;
create policy "payments_owner_all" on public.payments
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "payments_tenant_select" on public.payments;
create policy "payments_tenant_select" on public.payments
  for select to authenticated
  using (
    exists (
      select 1 from public.tenants t
      where t.id = payments.tenant_id
        and t.user_id = auth.uid()
    )
  );

-- 4.8 Receipts : propriétaire (SELECT) + locataire lié (SELECT)
drop policy if exists "receipts_owner_select" on public.receipts;
create policy "receipts_owner_select" on public.receipts
  for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "receipts_tenant_select" on public.receipts;
create policy "receipts_tenant_select" on public.receipts
  for select to authenticated
  using (
    exists (
      select 1 from public.tenants t
      where t.id = receipts.tenant_id
        and t.user_id = auth.uid()
    )
  );

-- 4.9 Reminder Logs : propriétaire uniquement
drop policy if exists "reminder_logs_owner_all" on public.reminder_logs;
create policy "reminder_logs_owner_all" on public.reminder_logs
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- 4.10 OTP Challenges : aucune lecture directe côté client (service_role uniquement)

-- ============================================================================
-- 5. FONCTIONS RPC MÉTIER (ATOMIQUES & IDEMPOTENTES)
-- ============================================================================

-- 5.1 Helper : étiquette d'opérateur lisible
create or replace function public.operator_display_label(p_op text)
returns text
language sql
immutable
as $$
  select case p_op
    when 'mtn' then 'MTN MoMo'
    when 'moov' then 'Moov Money'
    when 'celtiis' then 'Celtiis Cash'
    when 'cash' then 'Espèces'
    else coalesce(p_op, 'Mobile Money')
  end;
$$;

-- 5.2 Helper : nom de mois en français ("2026-11" -> "Novembre 2026")
create or replace function public.french_period_label(p_month text)
returns text
language plpgsql
immutable
as $$
declare
  v_year text;
  v_m int;
  v_names text[] := array[
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
  ];
begin
  v_year := split_part(p_month, '-', 1);
  v_m := split_part(p_month, '-', 2)::int;
  if v_m < 1 or v_m > 12 then
    return p_month;
  end if;
  return v_names[v_m] || ' ' || v_year;
end;
$$;

-- 5.3 confirm_payment : atomique & strictement idempotent
-- Garantit qu'un paiement réussi génère EXACTEMENT 1 reçu, même si le webhook est rejoué N fois.
create or replace function public.confirm_payment(
  p_payment_id uuid,
  p_provider_ref text default null,
  p_raw_webhook jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay public.payments%rowtype;
  v_rcp public.receipts%rowtype;
  v_tenant public.tenants%rowtype;
  v_prop public.properties%rowtype;
  v_period public.rent_periods%rowtype;
  v_owner public.profiles%rowtype;
  v_seq bigint;
  v_year text;
  v_receipt_no text;
  v_verif_code text;
  v_new_paid integer;
  v_new_status text;
begin
  -- Verrouillage exclusif de la ligne payment pour éviter toute race condition sur double webhook
  select * into v_pay
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND: %', p_payment_id;
  end if;

  -- Idempotence : si déjà confirmé ou si un reçu existe déjà pour ce payment_id, on renvoie le reçu existant
  select * into v_rcp
  from public.receipts
  where payment_id = v_pay.id;

  if found then
    return jsonb_build_object(
      'idempotent', true,
      'payment_id', v_pay.id,
      'receipt_id', v_rcp.id,
      'receipt_no', v_rcp.receipt_no,
      'verification_code', v_rcp.verification_code,
      'amount', v_rcp.amount,
      'tenant_name', v_rcp.tenant_name,
      'unit_label', v_rcp.unit_label,
      'property_name', v_rcp.property_name,
      'landlord_name', v_rcp.landlord_name,
      'period_label', v_rcp.period_label,
      'operator_label', v_rcp.operator_label,
      'issued_at', v_rcp.issued_at
    );
  end if;

  -- Chargement du contexte
  select * into v_tenant from public.tenants where id = v_pay.tenant_id;
  select * into v_prop from public.properties where id = v_tenant.property_id;
  select * into v_period from public.rent_periods where id = v_pay.rent_period_id for update;
  select * into v_owner from public.profiles where id = v_pay.owner_id;

  -- Mise à jour du paiement
  update public.payments
  set
    status = 'succeeded',
    provider_ref = coalesce(p_provider_ref, provider_ref),
    raw_webhook = coalesce(p_raw_webhook, raw_webhook),
    confirmed_at = coalesce(confirmed_at, now()),
    updated_at = now()
  where id = v_pay.id
  returning * into v_pay;

  -- Mise à jour de l'échéance de loyer
  v_new_paid := v_period.amount_paid + v_pay.amount;
  if v_new_paid >= v_period.amount_due then
    v_new_status := 'paid';
  else
    v_new_status := 'partial';
  end if;

  update public.rent_periods
  set
    amount_paid = v_new_paid,
    status = v_new_status,
    paid_at = case when v_new_status = 'paid' then coalesce(paid_at, now()) else paid_at end,
    updated_at = now()
  where id = v_period.id;

  -- Génération du numéro de reçu officiel séquentiel REC-YYYY-NNNNNN
  v_seq := nextval('public.receipt_seq');
  v_year := to_char(now(), 'YYYY');
  v_receipt_no := 'REC-' || v_year || '-' || lpad(v_seq::text, 6, '0');
  v_verif_code := upper(encode(extensions.digest(v_receipt_no || ':' || v_pay.id::text || ':' || extract(epoch from now())::text, 'sha256'), 'hex'));
  v_verif_code := 'LC-' || substr(v_verif_code, 1, 10);

  insert into public.receipts (
    receipt_no,
    verification_code,
    payment_id,
    org_id,
    owner_id,
    tenant_id,
    rent_period_id,
    tenant_name,
    tenant_phone,
    property_name,
    unit_label,
    landlord_name,
    period_label,
    amount,
    operator_label,
    qr_payload
  )
  values (
    v_receipt_no,
    v_verif_code,
    v_pay.id,
    v_pay.org_id,
    v_pay.owner_id,
    v_pay.tenant_id,
    v_pay.rent_period_id,
    v_tenant.full_name,
    v_tenant.phone,
    coalesce(v_prop.name, 'Résidence LoyerClair'),
    v_tenant.unit_label,
    coalesce(nullif(v_owner.full_name, ''), 'Propriétaire LoyerClair'),
    v_period.period_label,
    v_pay.amount,
    public.operator_display_label(v_pay.operator),
    '/verify/' || v_receipt_no
  )
  returning * into v_rcp;

  return jsonb_build_object(
    'idempotent', false,
    'payment_id', v_pay.id,
    'receipt_id', v_rcp.id,
    'receipt_no', v_rcp.receipt_no,
    'verification_code', v_rcp.verification_code,
    'amount', v_rcp.amount,
    'tenant_name', v_rcp.tenant_name,
    'unit_label', v_rcp.unit_label,
    'property_name', v_rcp.property_name,
    'landlord_name', v_rcp.landlord_name,
    'period_label', v_rcp.period_label,
    'operator_label', v_rcp.operator_label,
    'issued_at', v_rcp.issued_at
  );
end;
$$;

-- 5.4 record_cash_payment : enregistrement espèces en 1 clic par le propriétaire
create or replace function public.record_cash_payment(
  p_rent_period_id uuid,
  p_amount integer default null,
  p_actor_id uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period public.rent_periods%rowtype;
  v_tenant public.tenants%rowtype;
  v_remaining integer;
  v_pay_amount integer;
  v_pay_id uuid;
begin
  select * into v_period
  from public.rent_periods
  where id = p_rent_period_id;

  if not found then
    raise exception 'RENT_PERIOD_NOT_FOUND';
  end if;

  if p_actor_id is not null and v_period.owner_id <> p_actor_id then
    raise exception 'FORBIDDEN_NOT_OWNER';
  end if;

  select * into v_tenant from public.tenants where id = v_period.tenant_id;

  v_remaining := greatest(0, v_period.amount_due - v_period.amount_paid);
  v_pay_amount := coalesce(p_amount, v_remaining);

  if v_pay_amount <= 0 then
    raise exception 'ALREADY_PAID';
  end if;

  insert into public.payments (
    org_id,
    owner_id,
    tenant_id,
    rent_period_id,
    amount,
    fee_amount,
    net_amount,
    currency,
    operator,
    payer_phone,
    provider,
    provider_ref,
    status
  )
  values (
    v_period.org_id,
    v_period.owner_id,
    v_period.tenant_id,
    v_period.id,
    v_pay_amount,
    0,
    v_pay_amount,
    'XOF',
    'cash',
    v_tenant.phone,
    'cash',
    'CASH-' || gen_random_uuid()::text,
    'pending'
  )
  returning id into v_pay_id;

  return public.confirm_payment(v_pay_id, null, jsonb_build_object('source', 'cash_manual'));
end;
$$;

-- 5.5 claim_invite : réclamer un lien d'invitation locataire /t/[token]
create or replace function public.claim_invite(
  p_token text,
  p_user_id uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant public.tenants%rowtype;
begin
  select * into v_tenant
  from public.tenants
  where invite_token = p_token and active = true;

  if not found then
    raise exception 'INVITE_NOT_FOUND';
  end if;

  update public.tenants
  set
    user_id = coalesce(p_user_id, user_id),
    invite_claimed_at = coalesce(invite_claimed_at, now()),
    updated_at = now()
  where id = v_tenant.id
  returning * into v_tenant;

  return jsonb_build_object(
    'tenant_id', v_tenant.id,
    'full_name', v_tenant.full_name,
    'phone', v_tenant.phone,
    'unit_label', v_tenant.unit_label,
    'rent_amount', v_tenant.rent_amount,
    'claimed_at', v_tenant.invite_claimed_at
  );
end;
$$;

-- 5.6 get_invite_details : lecture publique contrôlée pour /t/[token] (paiement < 30s sans créer de compte)
create or replace function public.get_invite_details(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant public.tenants%rowtype;
  v_prop public.properties%rowtype;
  v_owner public.profiles%rowtype;
  v_period public.rent_periods%rowtype;
  v_receipts jsonb;
begin
  select * into v_tenant
  from public.tenants
  where invite_token = p_token and active = true;

  if not found then
    return null;
  end if;

  select * into v_prop from public.properties where id = v_tenant.property_id;
  select * into v_owner from public.profiles where id = v_tenant.owner_id;

  -- Dernière période active (priorité : non payée ou la plus récente)
  select * into v_period
  from public.rent_periods
  where tenant_id = v_tenant.id
  order by
    case when status in ('late', 'partial', 'pending') then 0 else 1 end,
    period_month desc
  limit 1;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'receipt_no', r.receipt_no,
      'verification_code', r.verification_code,
      'amount', r.amount,
      'period_label', r.period_label,
      'operator_label', r.operator_label,
      'tenant_name', r.tenant_name,
      'unit_label', r.unit_label,
      'property_name', r.property_name,
      'landlord_name', r.landlord_name,
      'issued_at', r.issued_at,
      'pdf_url', r.pdf_url
    ) order by r.issued_at desc
  ), '[]'::jsonb)
  into v_receipts
  from public.receipts r
  where r.tenant_id = v_tenant.id;

  return jsonb_build_object(
    'tenant', jsonb_build_object(
      'id', v_tenant.id,
      'full_name', v_tenant.full_name,
      'phone', v_tenant.phone,
      'unit_label', v_tenant.unit_label,
      'rent_amount', v_tenant.rent_amount,
      'due_day', v_tenant.due_day,
      'invite_token', v_tenant.invite_token,
      'opt_out_reminders', v_tenant.opt_out_reminders,
      'property_name', coalesce(v_prop.name, 'Résidence'),
      'property_city', coalesce(v_prop.city, 'Cotonou'),
      'landlord_name', coalesce(nullif(v_owner.full_name, ''), 'Propriétaire')
    ),
    'current_period', case when v_period.id is not null then jsonb_build_object(
      'id', v_period.id,
      'period_month', v_period.period_month,
      'period_label', v_period.period_label,
      'amount_due', v_period.amount_due,
      'amount_paid', v_period.amount_paid,
      'remaining', greatest(0, v_period.amount_due - v_period.amount_paid),
      'due_date', v_period.due_date,
      'status', v_period.status
    ) else null end,
    'receipts', v_receipts
  );
end;
$$;

-- 5.7 generate_rent_periods : génération mensuelle idempotente des échéances
create or replace function public.generate_rent_periods(
  p_month text default to_char(now(), 'YYYY-MM')
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_label text;
  v_tenant record;
  v_due_date date;
begin
  v_label := public.french_period_label(p_month);

  for v_tenant in
    select * from public.tenants where active = true
  loop
    v_due_date := to_date(p_month || '-' || lpad(least(v_tenant.due_day, 28)::text, 2, '0'), 'YYYY-MM-DD');

    insert into public.rent_periods (
      org_id,
      owner_id,
      tenant_id,
      period_month,
      period_label,
      amount_due,
      amount_paid,
      due_date,
      status
    )
    values (
      v_tenant.org_id,
      v_tenant.owner_id,
      v_tenant.id,
      p_month,
      v_label,
      v_tenant.rent_amount,
      0,
      v_due_date,
      case when v_due_date < current_date then 'late' else 'pending' end
    )
    on conflict (tenant_id, period_month) do nothing;

    if found then
      v_count := v_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'period_month', p_month,
    'period_label', v_label,
    'created_count', v_count
  );
end;
$$;

-- 5.8 mark_late_periods : marquage quotidien des loyers en retard
create or replace function public.mark_late_periods(
  p_as_of date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  with updated as (
    update public.rent_periods
    set
      status = 'late',
      updated_at = now()
    where status in ('pending', 'partial')
      and due_date < p_as_of
      and amount_paid < amount_due
    returning id
  )
  select count(*) into v_updated from updated;

  return jsonb_build_object(
    'as_of', p_as_of,
    'marked_late_count', v_updated
  );
end;
$$;

-- 5.9 verify_receipt : vérification publique d'un reçu par QR (receipt_no ou verification_code)
create or replace function public.verify_receipt(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rcp public.receipts%rowtype;
  v_clean text;
begin
  v_clean := upper(trim(p_code));

  select * into v_rcp
  from public.receipts
  where upper(receipt_no) = v_clean
     or upper(verification_code) = v_clean
  limit 1;

  if not found then
    return jsonb_build_object(
      'valid', false,
      'code', p_code
    );
  end if;

  return jsonb_build_object(
    'valid', true,
    'receipt_no', v_rcp.receipt_no,
    'verification_code', v_rcp.verification_code,
    'tenant_name', v_rcp.tenant_name,
    'property_name', v_rcp.property_name,
    'unit_label', v_rcp.unit_label,
    'landlord_name', v_rcp.landlord_name,
    'period_label', v_rcp.period_label,
    'amount', v_rcp.amount,
    'operator_label', v_rcp.operator_label,
    'issued_at', v_rcp.issued_at,
    'pdf_url', v_rcp.pdf_url
  );
end;
$$;

-- ============================================================================
-- 6. STORAGE BUCKET POUR LES REÇUS PDF
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

drop policy if exists "receipts_public_read" on storage.objects;
create policy "receipts_public_read" on storage.objects
  for select
  using (bucket_id = 'receipts');

drop policy if exists "receipts_auth_insert" on storage.objects;
create policy "receipts_auth_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts');
