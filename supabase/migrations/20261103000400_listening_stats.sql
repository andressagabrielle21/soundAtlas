create function public.read_listening_stats(
  start_on date default null,
  end_on date default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with logs as (
    select l.listened_on, l.rating_at_time, a.decade, a.genres
    from public.listen_logs l
    join public.albums a on a.id = l.album_id
    where l.user_id = (select auth.uid())
      and (start_on is null or l.listened_on >= start_on)
      and (end_on is null or l.listened_on <= end_on)
  ),
  genre_counts as (
    select genre, count(*) as total
    from logs
    cross join lateral (select distinct genre from unnest(genres) as tags(genre)
                        where genre is not null) as album_genres
    group by genre
  ),
  decade_counts as (
    select decade, count(*) as total
    from logs
    where decade is not null
    group by decade
  ),
  month_counts as (
    select to_char(listened_on, 'YYYY-MM') as month, count(*) as total
    from logs
    group by 1
  ),
  rating_counts as (
    select rating_at_time, count(*) as total
    from logs
    where rating_at_time is not null
    group by rating_at_time
  )
  select jsonb_build_object(
    'by_genre', coalesce((select jsonb_object_agg(genre, total) from genre_counts), '{}'::jsonb),
    'by_decade', coalesce((select jsonb_object_agg(decade, total) from decade_counts), '{}'::jsonb),
    'by_month', coalesce((select jsonb_object_agg(month, total) from month_counts), '{}'::jsonb),
    'by_rating', coalesce((select jsonb_object_agg(rating_at_time, total) from rating_counts), '{}'::jsonb)
  );
$$;

revoke execute on function public.read_listening_stats(date, date) from public, anon;
grant execute on function public.read_listening_stats(date, date) to authenticated;
