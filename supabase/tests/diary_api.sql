begin;

insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000011', '{"username":"diaryalice"}'),
  ('00000000-0000-0000-0000-000000000012', '{"username":"diarybruno"}');

insert into public.albums (id, external_id, title)
values ('00000000-0000-0000-0000-000000000013', 'diary-test', 'Titanic Rising');

set local role authenticated;

do $$
declare
  album constant uuid := '00000000-0000-0000-0000-000000000013';
  jan constant uuid := '00000000-0000-0000-0000-000000000014';
  mar constant uuid := '00000000-0000-0000-0000-000000000015';
  alice constant text := '{"sub":"00000000-0000-0000-0000-000000000011","role":"authenticated"}';
  bruno constant text := '{"sub":"00000000-0000-0000-0000-000000000012","role":"authenticated"}';
  snapshot jsonb;
begin
  perform set_config('request.jwt.claims', alice, true);
  snapshot := public.read_album_diary(album);
  perform public.write_album_diary(album, jan, 'insert', snapshot,
    '{"listened_on":"2026-01-10","rating_at_time":4,"is_relisten":false}',
    '{"status":"listened","rating":4}');

  begin
    perform public.write_album_diary(album, mar, 'insert', snapshot,
      '{"listened_on":"2026-03-10","rating_at_time":5,"is_relisten":true}',
      '{"status":"listened","rating":5}');
    raise exception 'Accepted a stale snapshot';
  exception when serialization_failure then null;
  end;

  perform public.write_album_diary(album, mar, 'insert', public.read_album_diary(album),
    '{"listened_on":"2026-03-10","rating_at_time":5,"is_relisten":true}',
    '{"status":"listened","rating":5}');
  snapshot := public.read_album_diary(album);
  if jsonb_array_length(snapshot->'logs') <> 2
    or (snapshot#>>'{entry,rating}')::numeric is distinct from 5 then
    raise exception 'Expected two logs and a rating of 5';
  end if;

  if (select array_agg(l.rating_at_time order by l.listened_on desc)
      from public.listen_logs l join public.albums a on a.id = l.album_id
      where a.id = album) is distinct from array[5, 4]::numeric[] then
    raise exception 'Timeline must keep both historical ratings in descending date order';
  end if;

  perform set_config('request.jwt.claims', bruno, true);
  if exists (select 1 from public.listen_logs where id = jan)
    or jsonb_array_length(public.read_album_diary(album)->'logs') <> 0 then
    raise exception 'Read another user''s logs';
  end if;
  begin
    perform public.write_album_diary(album, jan, 'update', public.read_album_diary(album),
      '{"listened_on":"2026-01-10","rating_at_time":1}', null);
    raise exception 'Updated another user''s log';
  exception when no_data_found then null;
  end;
  begin
    perform public.write_album_diary(album, jan, 'delete', public.read_album_diary(album), null, null);
    raise exception 'Deleted another user''s log';
  exception when no_data_found then null;
  end;

  perform set_config('request.jwt.claims', alice, true);
  perform public.write_album_diary(album, mar, 'update', public.read_album_diary(album),
    '{"listened_on":"2026-03-10","rating_at_time":4.5,"is_relisten":true}',
    '{"status":"listened","rating":4.5}');
  perform public.write_album_diary(album, mar, 'delete', public.read_album_diary(album), null,
    '{"status":"listened","rating":4}');
  snapshot := public.read_album_diary(album);
  if jsonb_array_length(snapshot->'logs') <> 1 or (snapshot#>>'{entry,rating}')::numeric is distinct from 4 then
    raise exception 'Expected one log and a rating of 4';
  end if;
end
$$;

rollback;
