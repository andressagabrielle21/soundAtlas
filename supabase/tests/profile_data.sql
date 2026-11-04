begin;

insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000061', '{"username":"exportalice"}'),
  ('00000000-0000-0000-0000-000000000062', '{"username":"exportbruno"}');

insert into public.albums (id, external_id, title)
values ('00000000-0000-0000-0000-000000000063', 'export-album', 'Álbum de teste');

insert into public.library_entries (user_id, album_id, status, rating, review) values
  ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000063', 'listened', 4.5, 'Minha resenha'),
  ('00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000063', 'listened', 1, 'Resenha privada');

insert into public.listen_logs (user_id, album_id, listened_on, rating_at_time, note) values
  ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000063', '2026-01-02', 3.5, 'Minha escuta'),
  ('00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000063', '2026-01-03', 1.5, 'Escuta privada');

set local role authenticated;
do $$
declare
  result jsonb;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000061"}', true);
  if public.read_profile_data() is distinct from '{"total_albums":1,"total_listens":1,"average_rating":4.5}'::jsonb then
    raise exception 'Unexpected profile summary';
  end if;

  result := public.read_profile_data(true);
  if jsonb_array_length(result->'library') is distinct from 1
     or jsonb_array_length(result->'diary') is distinct from 1
     or (result#>>'{library,0,rating}')::numeric is distinct from 4.5
     or (result#>>'{diary,0,rating_at_time}')::numeric is distinct from 3.5
     or result#>>'{library,0,review}' is distinct from 'Minha resenha'
     or result#>>'{diary,0,note}' is distinct from 'Minha escuta'
     or result#>>'{diary,0,external_id}' is distinct from 'export-album' then
    raise exception 'Unexpected export: %', result;
  end if;

  perform set_config('request.jwt.claims', '{}', true);
  if public.read_profile_data(true) is distinct from '{"library":[],"diary":[]}'::jsonb then
    raise exception 'Export exposed data without a user';
  end if;
end
$$;
rollback;
