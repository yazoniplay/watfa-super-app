-- Run this in the Supabase SQL Editor after creating a project.
-- Tables are protected with row-level security. Payment state must only be changed
-- by a trusted server/Edge Function after verifying the payment provider webhook.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'customer' check (role in ('customer', 'barber')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.barber_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  shop_name text not null,
  bio text,
  city text,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barber_profiles(user_id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  price_minor integer not null check (price_minor >= 0),
  currency text not null default 'SEK',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.haircut_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  style_name text not null,
  notes text,
  reference_image_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.face_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  private_image_path text not null,
  processing_status text not null default 'uploaded'
    check (processing_status in ('uploaded', 'processing', 'complete', 'failed', 'delete_requested')),
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  barber_id uuid not null references public.barber_profiles(user_id) on delete cascade,
  service_id uuid not null references public.services(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'refunded', 'failed')),
  created_at timestamptz not null default now(),
  constraint appointment_time_order check (ends_at > starts_at)
);

create index if not exists appointments_customer_start_idx
  on public.appointments(customer_id, starts_at);
create index if not exists appointments_barber_start_idx
  on public.appointments(barber_id, starts_at);
create index if not exists haircut_history_user_created_idx
  on public.haircut_history(user_id, created_at desc);

-- Prevent two pending/confirmed appointments from occupying the same barber's time.
-- Pending requests hold the slot until cancelled or otherwise resolved.
create extension if not exists btree_gist;
alter table public.appointments
  add constraint appointments_no_barber_overlap
  exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status in ('pending', 'confirmed'));

-- Validate that the chosen service belongs to the selected barber and that
-- the appointment duration matches the service's configured duration.
create or replace function public.validate_watfa_appointment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  service_duration integer;
begin
  if new.starts_at <= now() then
    raise exception 'Appointment must start in the future';
  end if;

  select s.duration_minutes
    into service_duration
    from public.services s
   where s.id = new.service_id
     and s.barber_id = new.barber_id
     and s.is_active = true;

  if service_duration is null then
    raise exception 'Selected service is unavailable for this barber';
  end if;

  if new.ends_at <> new.starts_at + make_interval(mins => service_duration) then
    raise exception 'Appointment duration does not match the selected service';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_watfa_appointment on public.appointments;
create trigger validate_watfa_appointment
  before insert or update of barber_id, service_id, starts_at, ends_at
  on public.appointments
  for each row execute procedure public.validate_watfa_appointment();

alter table public.profiles enable row level security;
alter table public.barber_profiles enable row level security;
alter table public.services enable row level security;
alter table public.haircut_history enable row level security;
alter table public.face_scans enable row level security;
alter table public.appointments enable row level security;

-- Users may view/update their own profile, but cannot change their own role.
create policy "profile read own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profile update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "barber profiles visible" on public.barber_profiles
  for select to authenticated using (true);
create policy "barber manages own profile" on public.barber_profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "active services visible" on public.services
  for select to authenticated using (is_active or barber_id = auth.uid());
create policy "barber manages own services" on public.services
  for all to authenticated using (barber_id = auth.uid()) with check (barber_id = auth.uid());

create policy "users read own haircut history" on public.haircut_history
  for select to authenticated using (user_id = auth.uid());
create policy "users add own haircut history" on public.haircut_history
  for insert to authenticated with check (user_id = auth.uid());
create policy "users delete own haircut history" on public.haircut_history
  for delete to authenticated using (user_id = auth.uid());

create policy "users read own face scans" on public.face_scans
  for select to authenticated using (user_id = auth.uid());
create policy "users add own face scans" on public.face_scans
  for insert to authenticated with check (user_id = auth.uid());
create policy "users delete own face scans" on public.face_scans
  for delete to authenticated using (user_id = auth.uid());

create policy "customers read own appointments" on public.appointments
  for select to authenticated using (customer_id = auth.uid());
create policy "barbers read appointments for them" on public.appointments
  for select to authenticated using (barber_id = auth.uid());
create policy "customers create own pending appointment" on public.appointments
  for insert to authenticated
  with check (
    customer_id = auth.uid()
    and status = 'pending'
    and payment_status = 'unpaid'
  );
-- Customers may update only the status column, and only to cancel their own booking.
-- This prevents a client from changing payment_status to 'paid' or editing booking details.
revoke update on public.appointments from authenticated;
grant update (status) on public.appointments to authenticated;

create policy "customers cancel own appointment" on public.appointments
  for update to authenticated
  using (customer_id = (select auth.uid()) and status in ('pending', 'confirmed'))
  with check (
    customer_id = (select auth.uid())
    and status = 'cancelled'
  );

-- Important:
-- 1. Never put a Supabase service-role key, AI provider key, or Stripe secret in the app.
-- 2. Do not let clients set payment_status to 'paid'; enforce payments server-side.
-- 3. Configure a private Storage bucket and storage.objects RLS before uploading face photos.
-- 4. Add appointment-overlap prevention and server-side availability checks before launch.


-- Automatically create a profile when a new Supabase Auth user signs up.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_watfa_profile on auth.users;
create trigger on_auth_user_created_watfa_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

-- Prevent users from granting themselves the barber role via profile updates.
create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Profile role changes require an administrator';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_watfa_profile_role on public.profiles;
create trigger protect_watfa_profile_role
  before update on public.profiles
  for each row execute procedure public.prevent_self_role_change();
