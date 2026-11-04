begin;

insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', '{"username":"alice"}'),
  ('00000000-0000-0000-0000-000000000002', '{"username":"bruno"}');

insert into public.artists (id, external_id, name)
values ('00000000-0000-0000-0000-000000000003', 'artist-test', 'Artista');

insert into public.albums (id, external_id, title, artist_id)
values ('00000000-0000-0000-0000-000000000004', 'album-test', 'Álbum',
        '00000000-0000-0000-0000-000000000003'),
       ('00000000-0000-0000-0000-000000000005', 'album-test-2', 'Álbum 2',
        '00000000-0000-0000-0000-000000000003');

insert into public.library_entries (user_id, album_id, status)
select id, '00000000-0000-0000-0000-000000000004', 'listened' from public.users
where username in ('alice', 'bruno');

insert into public.listen_logs (user_id, album_id, listened_on)
select id, '00000000-0000-0000-0000-000000000004', current_date from public.users
where username in ('alice', 'bruno');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

do $$
declare
  owner_id constant uuid := '00000000-0000-0000-0000-000000000001';
  other_id constant uuid := '00000000-0000-0000-0000-000000000002';
  album_id constant uuid := '00000000-0000-0000-0000-000000000004';
begin
  if (select count(*) from public.library_entries) <> 1
    or (select count(*) from public.listen_logs) <> 1
    or (select count(*) from public.users) <> 1 then
    raise exception 'Authenticated user must see only their own rows';
  end if;

  if (select count(*) from public.library_entries e
      join public.albums a on a.id = e.album_id
      where a.external_id = 'album-test') <> 1 then
    raise exception 'Library listing must only include the signed-in user''s entries';
  end if;

  if exists (select 1 from public.library_entries where user_id = other_id)
    or exists (select 1 from public.listen_logs where user_id = other_id)
    or exists (select 1 from public.users where id = other_id) then
    raise exception 'Read another user''s data';
  end if;

  update public.library_entries set status = 'listening' where user_id = other_id;
  if found then raise exception 'Updated another user''s entry'; end if;
  update public.library_entries set rating = 2.5, review = 'Resenha privada'
  where user_id = other_id;
  if found then raise exception 'Updated another user''s rating or review'; end if;
  delete from public.library_entries where user_id = other_id;
  if found then raise exception 'Deleted another user''s entry'; end if;
  update public.listen_logs set note = 'Alterado' where user_id = other_id;
  if found then raise exception 'Updated another user''s log'; end if;
  update public.users set username = 'alterado' where id = other_id;
  if found then raise exception 'Updated another user''s profile'; end if;
  delete from public.listen_logs where user_id = other_id;
  if found then raise exception 'Deleted another user''s log'; end if;

  begin
    insert into public.library_entries (user_id, album_id, status)
    values (other_id, '00000000-0000-0000-0000-000000000005', 'want');
    raise exception 'Inserted another user''s entry';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.listen_logs (user_id, album_id, listened_on)
    values (other_id, album_id, current_date);
    raise exception 'Inserted another user''s log';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.library_entries set user_id = other_id where user_id = owner_id;
    raise exception 'Transferred entry to another user';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.listen_logs set user_id = other_id where user_id = owner_id;
    raise exception 'Transferred log to another user';
  exception when insufficient_privilege then null;
  end;

  update public.library_entries set status = 'listening' where user_id = owner_id;
  if not found then raise exception 'Could not update own entry'; end if;
  delete from public.listen_logs where user_id = owner_id;
  if not found then raise exception 'Could not delete own log'; end if;
  insert into public.listen_logs (user_id, album_id, listened_on)
  values (owner_id, album_id, current_date);

  if not exists (select 1 from public.artists where external_id = 'artist-test')
    or not exists (select 1 from public.albums where external_id = 'album-test') then
    raise exception 'Authenticated user cannot read catalog';
  end if;

  begin
    update public.albums set title = 'Alterado';
    raise exception 'Authenticated user could write catalog';
  exception when insufficient_privilege then null;
  end;
end
$$;

do $$
declare
  target_album constant uuid := '00000000-0000-0000-0000-000000000004';
begin
  perform public.remove_library_album(target_album);
  if exists (select 1 from public.library_entries)
    or not exists (select 1 from public.listen_logs) then
    raise exception 'Removal must preserve listening logs by default';
  end if;

  insert into public.library_entries (user_id, album_id, status)
  values (auth.uid(), target_album, 'listening');
  perform public.remove_library_album(target_album, true);
  if exists (select 1 from public.library_entries)
    or exists (select 1 from public.listen_logs) then
    raise exception 'Removal must delete own listening logs when requested';
  end if;

  perform set_config(
    'request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}',
    true
  );
  if (select count(*) from public.library_entries where status = 'listened') <> 1
    or (select count(*) from public.listen_logs) <> 1 then
    raise exception 'Library removal affected another user';
  end if;
end
$$;

set local role anon;

do $$
begin
  begin
    perform 1 from public.artists;
    raise exception 'Anonymous user could read catalog';
  exception when insufficient_privilege then null;
  end;
end
$$;

rollback;
