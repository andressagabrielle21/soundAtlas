begin;

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  created_at timestamptz default now()
);

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,
  name text not null
);

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,
  title text not null,
  artist_id uuid references public.artists (id),
  release_date date,
  release_year int,
  decade int generated always as ((release_year / 10) * 10) stored,
  genres text[] default '{}',
  cover_url text,
  track_count int,
  fetched_at timestamptz default now()
);

create table public.library_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  album_id uuid not null references public.albums (id),
  status text not null check (status in ('want', 'listening', 'listened')),
  rating numeric(2,1) check (rating between 0.5 and 5),
  review text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, album_id)
);

create table public.listen_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  album_id uuid not null references public.albums (id),
  listened_on date not null,
  rating_at_time numeric(2,1) check (rating_at_time between 0.5 and 5),
  note text,
  is_relisten boolean default false,
  created_at timestamptz default now()
);

create index listen_logs_user_listened_on_idx
  on public.listen_logs (user_id, listened_on desc);
create index library_entries_user_status_idx
  on public.library_entries (user_id, status);

alter table public.users enable row level security;
alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.library_entries enable row level security;
alter table public.listen_logs enable row level security;

revoke all on public.users, public.artists, public.albums,
  public.library_entries, public.listen_logs from public, anon, authenticated;

grant select, insert, update on public.users to authenticated;
grant select on public.artists, public.albums to authenticated;
grant select, insert, update, delete on public.library_entries, public.listen_logs
  to authenticated;
grant select, insert, update, delete on public.users, public.artists, public.albums,
  public.library_entries, public.listen_logs to service_role;

create policy users_own_profile on public.users
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy artists_authenticated_read on public.artists
  for select to authenticated using (true);

create policy albums_authenticated_read on public.albums
  for select to authenticated using (true);

create policy library_entries_owner_access on public.library_entries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy listen_logs_owner_access on public.listen_logs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
