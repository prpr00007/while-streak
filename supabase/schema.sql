-- while(streak) schema. Paste into the Supabase SQL editor and run once.

create table if not exists public.puzzles (
  number       int primary key,
  publish_date date not null unique,
  format       text not null default 'order' check (format in ('order')),
  title        text not null,
  prompt       text not null,
  lines        jsonb not null,  -- [{ "id": "a", "text": "def f():", "indent": 0 }, ...]
  solution     jsonb not null,  -- ["a", "b", ...]
  why          text not null
);
alter table public.puzzles enable row level security;
-- +1 day covers time zones ahead of UTC; future puzzles stay hidden.
create policy "published puzzles are readable" on public.puzzles
  for select using (publish_date <= (now() at time zone 'utc')::date + 1);

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles are public" on public.profiles for select using (true);
create policy "users create their profile" on public.profiles for insert with check (auth.uid() = id);
create policy "users update their profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create table if not exists public.results (
  user_id       uuid not null references auth.users(id) on delete cascade,
  puzzle_number int not null,
  solved        boolean not null,
  tries         smallint not null check (tries between 1 and 4),
  time_ms       int not null check (time_ms >= 0),
  grid          text not null,
  created_at    timestamptz not null default now(),
  primary key (user_id, puzzle_number)
);
alter table public.results enable row level security;
create policy "results are public" on public.results for select using (true);
-- No update or delete policy: a submitted result is final.
create policy "users submit their own result" on public.results for insert with check (auth.uid() = user_id);

create or replace view public.leaderboard with (security_invoker = true) as
  select r.puzzle_number, r.user_id, p.username, r.solved, r.tries, r.time_ms
  from public.results r
  join public.profiles p on p.id = r.user_id;
grant select on public.leaderboard to anon, authenticated;
