create function public.read_album_diary(target_album uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'entry', (select jsonb_build_object('status', status, 'rating', rating)
      from public.library_entries where user_id = auth.uid() and album_id = target_album),
    'logs', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'listened_on', listened_on, 'rating_at_time', rating_at_time,
      'note', note, 'is_relisten', coalesce(is_relisten, false)
    ) order by created_at nulls first, id)
      from public.listen_logs where user_id = auth.uid() and album_id = target_album), '[]'::jsonb)
  );
$$;

create function public.write_album_diary(
  target_album uuid, target_log uuid, operation text,
  expected jsonb, log_data jsonb, next_entry jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
begin
  if owner_id is null then
    raise insufficient_privilege;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(owner_id::text || target_album::text, 0));
  perform 1 from public.library_entries
    where user_id = owner_id and album_id = target_album for update;

  if expected is distinct from public.read_album_diary(target_album) then
    raise serialization_failure;
  end if;

  if operation in ('insert', 'update') and log_data->>'rating_at_time' is not null
    and ((log_data->>'rating_at_time')::numeric not between 0.5 and 5
      or mod((log_data->>'rating_at_time')::numeric, 0.5) <> 0) then
    raise check_violation;
  end if;

  if operation = 'insert' then
    insert into public.listen_logs (id, user_id, album_id, listened_on, rating_at_time, note, is_relisten, created_at)
    values (target_log, owner_id, target_album, (log_data->>'listened_on')::date,
      (log_data->>'rating_at_time')::numeric, log_data->>'note',
      (log_data->>'is_relisten')::boolean, clock_timestamp());
  elsif operation = 'update' then
    update public.listen_logs set listened_on = (log_data->>'listened_on')::date,
      rating_at_time = (log_data->>'rating_at_time')::numeric, note = log_data->>'note',
      is_relisten = (log_data->>'is_relisten')::boolean
    where id = target_log and user_id = owner_id and album_id = target_album;
    if not found then raise no_data_found; end if;
  elsif operation = 'delete' then
    delete from public.listen_logs
    where id = target_log and user_id = owner_id and album_id = target_album;
    if not found then raise no_data_found; end if;
  else
    raise invalid_parameter_value;
  end if;

  if coalesce(next_entry, 'null'::jsonb) is distinct from expected->'entry' then
    if expected->'entry' = 'null'::jsonb then
      insert into public.library_entries (user_id, album_id, status, rating)
      values (owner_id, target_album, 'listened', (next_entry->>'rating')::numeric)
      on conflict (user_id, album_id) do nothing;
      if not found then raise serialization_failure; end if;
    else
      update public.library_entries set rating = (next_entry->>'rating')::numeric
      where user_id = owner_id and album_id = target_album;
    end if;
  end if;
end;
$$;

revoke execute on function public.read_album_diary(uuid),
  public.write_album_diary(uuid, uuid, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.read_album_diary(uuid),
  public.write_album_diary(uuid, uuid, text, jsonb, jsonb, jsonb) to authenticated;
