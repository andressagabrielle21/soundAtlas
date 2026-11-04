create function public.read_profile_data(export_records boolean default false)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
begin
  if export_records then
    return jsonb_build_object(
      'library', coalesce((
        select jsonb_agg(to_jsonb(e) - 'user_id' || jsonb_build_object(
          'external_id', a.external_id, 'title', a.title, 'artist', ar.name,
          'release_year', a.release_year
        ) order by e.created_at, e.id)
        from public.library_entries e
        join public.albums a on a.id = e.album_id
        left join public.artists ar on ar.id = a.artist_id
        where e.user_id = owner_id
      ), '[]'::jsonb),
      'diary', coalesce((
        select jsonb_agg(to_jsonb(l) - 'user_id' || jsonb_build_object(
          'external_id', a.external_id, 'title', a.title, 'artist', ar.name,
          'release_year', a.release_year
        ) order by l.listened_on, l.created_at, l.id)
        from public.listen_logs l
        join public.albums a on a.id = l.album_id
        left join public.artists ar on ar.id = a.artist_id
        where l.user_id = owner_id
      ), '[]'::jsonb)
    );
  end if;

  return (
    select jsonb_build_object(
      'total_albums', count(*),
      'total_listens', (select count(*) from public.listen_logs where user_id = owner_id),
      'average_rating', avg(rating)
    )
    from public.library_entries
    where user_id = owner_id
  );
end;
$$;

revoke execute on function public.read_profile_data(boolean) from public, anon;
grant execute on function public.read_profile_data(boolean) to authenticated;
