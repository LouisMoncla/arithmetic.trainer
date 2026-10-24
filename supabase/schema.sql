-- Arithmetic Trainer: tables for optional account sync.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Row-level security makes every row visible and writable only by the account that owns it.

create table if not exists public.rounds (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  started_at timestamptz,
  data       jsonb,                          -- the round exactly as the app stores it; null once deleted
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists rounds_user_updated on public.rounds (user_id, updated_at);

create table if not exists public.profiles (
  user_id    uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  settings   jsonb,
  presets    jsonb,
  updated_at timestamptz not null default now()
);

-- Server time on every write: the app pulls "changed since" by this column.
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists rounds_touch on public.rounds;
create trigger rounds_touch before insert or update on public.rounds
  for each row execute function public.touch_updated_at();
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before insert or update on public.profiles
  for each row execute function public.touch_updated_at();

alter table public.rounds   enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "own rounds" on public.rounds;
create policy "own rounds" on public.rounds for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- "Delete my account" in Settings: removes the sign-in itself; rounds and profile go with it (on delete cascade).
create or replace function public.delete_my_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
