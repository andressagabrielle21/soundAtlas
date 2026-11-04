create function public.remove_library_album(target_album uuid, remove_logs boolean default false)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.library_entries
  where user_id = auth.uid() and album_id = target_album;

  if found and remove_logs then
    delete from public.listen_logs
    where user_id = auth.uid() and album_id = target_album;
  end if;
end;
$$;

revoke execute on function public.remove_library_album(uuid, boolean) from public;
grant execute on function public.remove_library_album(uuid, boolean) to authenticated;
