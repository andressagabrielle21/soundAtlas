begin;

insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000051', '{"username":"statsalice"}'),
  ('00000000-0000-0000-0000-000000000052', '{"username":"statsbruno"}');

insert into public.albums (id, external_id, title, release_year, genres) values
  ('00000000-0000-0000-0000-000000000053', 'stats-a', 'Álbum A', 1999, array['rock', 'pop', 'rock']),
  ('00000000-0000-0000-0000-000000000054', 'stats-b', 'Álbum B', 2000, array['pop']),
  ('00000000-0000-0000-0000-000000000055', 'stats-c', 'Álbum C', null, '{}');

insert into public.listen_logs (user_id, album_id, listened_on, rating_at_time, is_relisten)
select ('00000000-0000-0000-0000-0000000000' || owner)::uuid,
       ('00000000-0000-0000-0000-0000000000' || album)::uuid,
       day::date, rating, relisten
from (values
  ('51', '53', '2025-12-31', 1, false),
  ('51', '53', '2026-01-01', 4.5, false),
  ('51', '53', '2026-01-15', 4.5, true),
  ('51', '55', '2026-02-01', null, false),
  ('51', '54', '2026-02-28', 5, false),
  ('51', '54', '2026-03-01', 2, true),
  ('52', '54', '2026-01-01', 3, false)
) as fixture(owner, album, day, rating, relisten);

set local role authenticated;

do $$
declare
  empty_stats constant jsonb := '{"by_genre": {}, "by_decade": {}, "by_month": {}, "by_rating": {}}';
  stats jsonb;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000051"}', true);
  stats := public.read_listening_stats('2026-01-01', '2026-02-28');
  if stats is distinct from '{
    "by_genre": {"rock": 2, "pop": 3},
    "by_decade": {"1990": 2, "2000": 1},
    "by_month": {"2026-01": 2, "2026-02": 2},
    "by_rating": {"4.5": 2, "5.0": 1}
  }'::jsonb then
    raise exception 'Unexpected period stats: %', stats;
  end if;

  if public.read_listening_stats('2024-01-01', '2024-12-31') is distinct from empty_stats then
    raise exception 'Expected empty stats';
  end if;

  if public.read_listening_stats()->'by_month' is distinct from
    '{"2025-12": 1, "2026-01": 2, "2026-02": 2, "2026-03": 1}'::jsonb then
    raise exception 'Expected all months without bounds';
  end if;

  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000052"}', true);
  stats := public.read_listening_stats('2026-01-01', '2026-01-01');
  if stats is distinct from '{
    "by_genre": {"pop": 1}, "by_decade": {"2000": 1},
    "by_month": {"2026-01": 1}, "by_rating": {"3.0": 1}
  }'::jsonb then
    raise exception 'Unexpected stats for second user: %', stats;
  end if;
end
$$;

rollback;
