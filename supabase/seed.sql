-- ============================================================================
-- LoyerClair — Seed initial (Propriétaire Adjoa + 4 locataires + historique 6 mois
-- + 2e propriétaire Bruno Soglo pour le test d'isolation RLS)
-- ============================================================================

-- 1. Utilisateurs Auth (idempotent, compatible GoTrue v2)
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone_change,
  phone_change_token,
  email_change_token_current,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'adjoa@loyerclair.bj',
    extensions.crypt('LoyerClairDemo2026!', extensions.gen_salt('bf')),
    now(),
    '+22997001122',
    now(),
    '', '', '', '', '', '', '', '',
    '{"provider":"phone","providers":["phone","email"]}'::jsonb,
    '{"full_name":"Adjoa Mensah","phone":"+229 97 00 11 22","role":"landlord"}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'bruno@loyerclair.bj',
    extensions.crypt('LoyerClairDemo2026!', extensions.gen_salt('bf')),
    now(),
    '+22996889900',
    now(),
    '', '', '', '', '', '', '', '',
    '{"provider":"phone","providers":["phone","email"]}'::jsonb,
    '{"full_name":"Bruno Soglo","phone":"+229 96 88 99 00","role":"landlord"}'::jsonb,
    now(),
    now()
  ),
  (
    '33333333-3333-4333-8333-333333333331',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'koffi@loyerclair.bj',
    extensions.crypt('LoyerClairDemo2026!', extensions.gen_salt('bf')),
    now(),
    '+22997123456',
    now(),
    '', '', '', '', '', '', '', '',
    '{"provider":"phone","providers":["phone","email"]}'::jsonb,
    '{"full_name":"Koffi Adjovi","phone":"+229 97 12 34 56","role":"tenant"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do nothing;

-- 2. Profiles
insert into public.profiles (id, phone, full_name, role, onboarded)
values
  ('11111111-1111-4111-8111-111111111111', '+229 97 00 11 22', 'Adjoa Mensah', 'landlord', true),
  ('22222222-2222-4222-8222-222222222222', '+229 96 88 99 00', 'Bruno Soglo', 'landlord', true),
  ('33333333-3333-4333-8333-333333333331', '+229 97 12 34 56', 'Koffi Adjovi', 'tenant', true)
on conflict (id) do update
set
  full_name = excluded.full_name,
  role = excluded.role,
  onboarded = excluded.onboarded;

-- 3. Organizations
insert into public.organizations (id, owner_id, name, payout_phone, payout_operator)
values
  ('aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Patrimoine Adjoa Mensah', '+229 97 00 11 22', 'mtn'),
  ('aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '22222222-2222-4222-8222-222222222222', 'Immo Soglo Porto-Novo', '+229 96 88 99 00', 'moov')
on conflict (id) do nothing;

-- 4. Properties
insert into public.properties (id, org_id, owner_id, name, city, neighborhood, address, units_count)
values
  ('bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Résidence Les Cocotiers', 'Cotonou', 'Haie Vive', 'Rue 412, Haie Vive, Cotonou', 6),
  ('bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Villa Ganhi Horizon', 'Cotonou', 'Ganhi', 'Avenue Steinmetz, Cotonou', 2),
  ('bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '22222222-2222-4222-8222-222222222222', 'Cour Ouando', 'Porto-Novo', 'Ouando', 'Carrefour Ouando, Porto-Novo', 4)
on conflict (id) do nothing;

-- 5. Units
insert into public.units (id, property_id, org_id, owner_id, label, rent_amount, due_day)
values
  ('ccccccc1-cccc-4ccc-8ccc-ccccccccccc1', 'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Appt 2A', 50000, 5),
  ('ccccccc2-cccc-4ccc-8ccc-ccccccccccc2', 'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Studio 4', 35000, 5),
  ('ccccccc3-cccc-4ccc-8ccc-ccccccccccc3', 'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Appt 1B', 45000, 5),
  ('ccccccc4-cccc-4ccc-8ccc-ccccccccccc4', 'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Villa 7', 80000, 5),
  ('ccccccc5-cccc-4ccc-8ccc-ccccccccccc5', 'bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '22222222-2222-4222-8222-222222222222', 'Appt B1', 60000, 5)
on conflict (id) do nothing;

-- 6. Tenants (les 4 locataires du prototype + 1 locataire du 2e propriétaire)
insert into public.tenants (
  id, org_id, owner_id, property_id, unit_id, user_id,
  full_name, phone, unit_label, rent_amount, due_day, invite_token, invite_claimed_at
)
values
  (
    'ddddddd1-dddd-4ddd-8ddd-ddddddddddd1',
    'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '11111111-1111-4111-8111-111111111111',
    'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'ccccccc1-cccc-4ccc-8ccc-ccccccccccc1',
    '33333333-3333-4333-8333-333333333331',
    'Koffi Adjovi', '+229 97 12 34 56', 'Appt 2A', 50000, 5, 'koffi-2a', now()
  ),
  (
    'ddddddd2-dddd-4ddd-8ddd-ddddddddddd2',
    'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '11111111-1111-4111-8111-111111111111',
    'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'ccccccc2-cccc-4ccc-8ccc-ccccccccccc2',
    null,
    'Awa Sossou', '+229 96 55 21 08', 'Studio 4', 35000, 5, 'awa-s4', null
  ),
  (
    'ddddddd3-dddd-4ddd-8ddd-ddddddddddd3',
    'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '11111111-1111-4111-8111-111111111111',
    'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'ccccccc3-cccc-4ccc-8ccc-ccccccccccc3',
    null,
    'Jean Houngbo', '+229 95 40 77 12', 'Appt 1B', 45000, 5, 'jean-1b', null
  ),
  (
    'ddddddd4-dddd-4ddd-8ddd-ddddddddddd4',
    'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '11111111-1111-4111-8111-111111111111',
    'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'ccccccc4-cccc-4ccc-8ccc-ccccccccccc4',
    null,
    'Fatou Dossou', '+229 99 31 62 90', 'Villa 7', 80000, 5, 'fatou-v7', now()
  ),
  (
    'ddddddd5-dddd-4ddd-8ddd-ddddddddddd5',
    'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '22222222-2222-4222-8222-222222222222',
    'bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
    'ccccccc5-cccc-4ccc-8ccc-ccccccccccc5',
    null,
    'Sènan Agbossou', '+229 94 11 22 33', 'Appt B1', 60000, 5, 'senan-b1', null
  )
on conflict (id) do nothing;

-- 7. Rent Periods : mois courant (Novembre 2026, comme dans design/loyerclair-demo.html) + historique 5 mois
insert into public.rent_periods (
  id, org_id, owner_id, tenant_id, period_month, period_label, amount_due, amount_paid, due_date, status
)
values
  -- Novembre 2026 (mois actif de référence)
  ('eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee1', 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'ddddddd1-dddd-4ddd-8ddd-ddddddddddd1', '2026-11', 'Novembre 2026', 50000, 0, '2026-11-05', 'pending'),
  ('eeeeeee2-eeee-4eee-8eee-eeeeeeeeeee2', 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'ddddddd2-dddd-4ddd-8ddd-ddddddddddd2', '2026-11', 'Novembre 2026', 35000, 0, '2026-10-05', 'late'),
  ('eeeeeee3-eeee-4eee-8eee-eeeeeeeeeee3', 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'ddddddd3-dddd-4ddd-8ddd-ddddddddddd3', '2026-11', 'Novembre 2026', 45000, 0, '2026-11-05', 'pending'),
  ('eeeeeee4-eeee-4eee-8eee-eeeeeeeeeee4', 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'ddddddd4-dddd-4ddd-8ddd-ddddddddddd4', '2026-11', 'Novembre 2026', 80000, 0, '2026-11-05', 'pending'),
  -- Locataire du 2e propriétaire (Bruno Soglo)
  ('eeeeeee5-eeee-4eee-8eee-eeeeeeeeeee5', 'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '22222222-2222-4222-8222-222222222222', 'ddddddd5-dddd-4ddd-8ddd-ddddddddddd5', '2026-11', 'Novembre 2026', 60000, 0, '2026-11-05', 'pending'),
  -- Historique Juin → Octobre 2026 pour le graphique 6–12 mois d'Adjoa
  ('eeeeeee6-eeee-4eee-8eee-eeeeeeeeee06', 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'ddddddd1-dddd-4ddd-8ddd-ddddddddddd1', '2026-06', 'Juin 2026', 210000, 175000, '2026-06-05', 'partial'),
  ('eeeeeee7-eeee-4eee-8eee-eeeeeeeeee07', 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'ddddddd1-dddd-4ddd-8ddd-ddddddddddd1', '2026-07', 'Juillet 2026', 210000, 210000, '2026-07-05', 'paid'),
  ('eeeeeee8-eeee-4eee-8eee-eeeeeeeeee08', 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'ddddddd1-dddd-4ddd-8ddd-ddddddddddd1', '2026-08', 'Août 2026', 210000, 165000, '2026-08-05', 'partial'),
  ('eeeeeee9-eeee-4eee-8eee-eeeeeeeeee09', 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'ddddddd1-dddd-4ddd-8ddd-ddddddddddd1', '2026-09', 'Septembre 2026', 210000, 210000, '2026-09-05', 'paid'),
  ('eeeeeeea-eeee-4eee-8eee-eeeeeeeeee10', 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'ddddddd1-dddd-4ddd-8ddd-ddddddddddd1', '2026-10', 'Octobre 2026', 210000, 210000, '2026-10-05', 'paid')
on conflict (tenant_id, period_month) do nothing;

-- 8. Paiements initiaux (Koffi Adjovi 50 000 FCFA MTN MoMo & Fatou Dossou 80 000 FCFA Moov Money)
insert into public.payments (
  id, org_id, owner_id, tenant_id, rent_period_id,
  amount, fee_amount, net_amount, currency, operator, payer_phone,
  provider, provider_ref, idempotency_key, status
)
values
  (
    'fffffff1-ffff-4fff-8fff-fffffffffff1',
    'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '11111111-1111-4111-8111-111111111111',
    'ddddddd1-dddd-4ddd-8ddd-ddddddddddd1',
    'eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee1',
    50000, 900, 49100, 'XOF', 'mtn', '+229 97 12 34 56',
    'mock', 'MOCK-SEED-KOFFI-001', 'seed-koffi-2026-11', 'pending'
  ),
  (
    'fffffff2-ffff-4fff-8fff-fffffffffff2',
    'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '11111111-1111-4111-8111-111111111111',
    'ddddddd4-dddd-4ddd-8ddd-ddddddddddd4',
    'eeeeeee4-eeee-4eee-8eee-eeeeeeeeeee4',
    80000, 1440, 78560, 'XOF', 'moov', '+229 99 31 62 90',
    'mock', 'MOCK-SEED-FATOU-002', 'seed-fatou-2026-11', 'pending'
  )
on conflict (id) do nothing;

-- Confirmation atomique des 2 paiements initiaux -> génère REC-2026-000001 et REC-2026-000002
select public.confirm_payment('fffffff1-ffff-4fff-8fff-fffffffffff1', 'MOCK-SEED-KOFFI-001', '{"seed":true}'::jsonb);
select public.confirm_payment('fffffff2-ffff-4fff-8fff-fffffffffff2', 'MOCK-SEED-FATOU-002', '{"seed":true}'::jsonb);
