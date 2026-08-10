-- Rozana — cloud schema
--
-- Run this once in the Supabase SQL editor when you are ready to move off
-- device-only storage. It creates the tables and, more importantly, the
-- row-level security policies that make roles real: a viewer is refused by
-- the database, not merely shown fewer buttons.
--
-- Nothing in the app depends on this yet.

-- ─────────────────────────  Tables  ─────────────────────────

create table if not exists public.spaces (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  currency          text not null default 'PKR',
  period_start_day  smallint not null default 1
                      check (period_start_day between 1 and 28),
  created_by        uuid not null references auth.users (id),
  created_at        timestamptz not null default now()
);

create type public.member_role as enum ('owner', 'admin', 'member', 'viewer');

create table if not exists public.space_members (
  space_id  uuid not null references public.spaces (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  role      public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

-- A person is who money belongs to. Usually that is a member with a login,
-- but a child or a parent without the app still needs to appear in reports,
-- so user_id is nullable.
create table if not exists public.people (
  id        uuid primary key default gen_random_uuid(),
  space_id  uuid not null references public.spaces (id) on delete cascade,
  user_id   uuid references auth.users (id) on delete set null,
  name      text not null,
  tint      text[] not null default array['#6B2FB5', '#9B3F9E'],
  archived  boolean not null default false
);

create table if not exists public.accounts (
  id        uuid primary key default gen_random_uuid(),
  space_id  uuid not null references public.spaces (id) on delete cascade,
  person_id uuid references public.people (id) on delete set null,
  name      text not null,
  kind      text not null check (kind in ('cash', 'bank', 'savings')),
  currency  text not null default 'PKR',
  opening   bigint not null default 0,
  archived  boolean not null default false
);

create table if not exists public.categories (
  id       uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  name     text not null,
  icon     text not null default 'dots',
  scopes   text[] not null default array['household', 'personal'],
  only_dir text check (only_dir in ('in', 'out'))
);

create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces (id) on delete cascade,
  account_id  uuid not null references public.accounts (id) on delete cascade,
  person_id   uuid references public.people (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  direction   text not null check (direction in ('in', 'out')),
  -- Minor units (paisa). Integer so arithmetic is exact.
  amount      bigint not null check (amount > 0),
  -- When the money actually moved. Balances follow this.
  date_paid   date not null,
  -- Which month it counts against. Reports follow this. Usually the month of
  -- date_paid, deliberately different when a bill is settled early or late.
  period      text not null check (period ~ '^\d{4}-\d{2}$'),
  scope       text not null default 'household'
                check (scope in ('household', 'personal')),
  note        text,
  -- Both halves of a transfer share this. Rows carrying it are movements
  -- between own accounts and must be excluded from every total.
  transfer_id uuid,
  created_at  timestamptz not null default now(),
  created_by  uuid not null references auth.users (id)
);

create index if not exists entries_space_period_idx on public.entries (space_id, period);
create index if not exists entries_account_date_idx on public.entries (account_id, date_paid desc);
create index if not exists entries_transfer_idx on public.entries (transfer_id)
  where transfer_id is not null;

-- Invites. The token in a shared link is the actual credential, so it is long
-- and random. The four-digit code a family member picks is a lock on their own
-- device, never a password the server would accept — four digits is 10,000
-- guesses, which is fine for stopping a curious relative and useless against
-- anyone on the internet.
create table if not exists public.space_invites (
  token      text primary key,
  space_id   uuid not null references public.spaces (id) on delete cascade,
  -- Optionally pre-assigns the joiner to an existing person, so their name and
  -- history are already waiting for them.
  person_id  uuid references public.people (id) on delete set null,
  role       public.member_role not null default 'member',
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_at    timestamptz,
  used_by    uuid references auth.users (id)
);

-- ─────────────────────────  Role helpers  ─────────────────────────
-- SECURITY DEFINER so policies can read space_members without the policy on
-- space_members recursing into itself.

create or replace function public.role_in(target_space uuid)
returns public.member_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.space_members
   where space_id = target_space and user_id = auth.uid()
$$;

create or replace function public.can_read(target_space uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select public.role_in(target_space) is not null $$;

create or replace function public.can_write(target_space uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select public.role_in(target_space) in ('owner', 'admin', 'member') $$;

create or replace function public.can_admin(target_space uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select public.role_in(target_space) in ('owner', 'admin') $$;

-- ─────────────────────────  Row-level security  ─────────────────────────

alter table public.spaces        enable row level security;
alter table public.space_members enable row level security;
alter table public.people        enable row level security;
alter table public.accounts      enable row level security;
alter table public.categories    enable row level security;
alter table public.entries       enable row level security;

-- Spaces
create policy spaces_read on public.spaces
  for select using (public.can_read(id));
create policy spaces_insert on public.spaces
  for insert with check (created_by = auth.uid());
create policy spaces_update on public.spaces
  for update using (public.can_admin(id)) with check (public.can_admin(id));
create policy spaces_delete on public.spaces
  for delete using (public.role_in(id) = 'owner');

-- Membership. Reading your own row must not depend on can_read, or the
-- helper and the policy would chase each other.
create policy members_read_self on public.space_members
  for select using (user_id = auth.uid() or public.can_read(space_id));
create policy members_manage on public.space_members
  for all using (public.can_admin(space_id)) with check (public.can_admin(space_id));

-- Reference data: everyone in the space reads, admins change.
create policy people_read on public.people
  for select using (public.can_read(space_id));
create policy people_write on public.people
  for all using (public.can_admin(space_id)) with check (public.can_admin(space_id));

create policy accounts_read on public.accounts
  for select using (public.can_read(space_id));
create policy accounts_write on public.accounts
  for all using (public.can_admin(space_id)) with check (public.can_admin(space_id));

create policy categories_read on public.categories
  for select using (public.can_read(space_id));
create policy categories_write on public.categories
  for all using (public.can_admin(space_id)) with check (public.can_admin(space_id));

-- Entries. A member may add and may change only what they added; an admin
-- may change anything; a viewer may only look.
create policy entries_read on public.entries
  for select using (public.can_read(space_id));

create policy entries_insert on public.entries
  for insert with check (public.can_write(space_id) and created_by = auth.uid());

create policy entries_update on public.entries
  for update
  using (public.can_admin(space_id) or (public.can_write(space_id) and created_by = auth.uid()))
  with check (public.can_admin(space_id) or (public.can_write(space_id) and created_by = auth.uid()));

create policy entries_delete on public.entries
  for delete
  using (public.can_admin(space_id) or (public.can_write(space_id) and created_by = auth.uid()));

-- Invites are administrative: only an admin may see or create them. Joining
-- happens through redeem_invite below, which does not need this policy.
alter table public.space_invites enable row level security;
create policy invites_admin on public.space_invites
  for all using (public.can_admin(space_id)) with check (public.can_admin(space_id));

-- ─────────────────────────  Joining a space  ─────────────────────────

-- SECURITY DEFINER because whoever is redeeming is, by definition, not yet a
-- member and so cannot read the invite row under the policy above.
create or replace function public.redeem_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.space_invites;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;

  select * into inv
    from public.space_invites
   where token = invite_token
     and used_at is null
     and expires_at > now();

  if not found then
    raise exception 'This invite link has expired or has already been used.';
  end if;

  insert into public.space_members (space_id, user_id, role)
       values (inv.space_id, auth.uid(), inv.role)
  on conflict (space_id, user_id) do nothing;

  -- Claim the person the invite was addressed to, so the joiner's existing
  -- entries and accounts are already theirs.
  if inv.person_id is not null then
    update public.people
       set user_id = auth.uid()
     where id = inv.person_id
       and user_id is null;
  end if;

  update public.space_invites
     set used_at = now(), used_by = auth.uid()
   where token = inv.token;

  return inv.space_id;
end;
$$;

revoke all on function public.redeem_invite(text) from public;
grant execute on function public.redeem_invite(text) to authenticated;

-- ─────────────────────────  Live updates  ─────────────────────────
-- Lets every phone in the space see a new entry within a second or so.

alter publication supabase_realtime add table public.entries;
alter publication supabase_realtime add table public.accounts;
alter publication supabase_realtime add table public.people;
