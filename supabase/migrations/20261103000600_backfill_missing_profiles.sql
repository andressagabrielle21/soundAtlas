begin;

-- Accounts created before the signup trigger may lack the profile required by
-- library_entries and listen_logs.
do $$
declare
  account record;
  profile_username text;
begin
  for account in
    select a.id, lower(btrim(a.raw_user_meta_data ->> 'username')) as username
    from auth.users a
    where not exists (select 1 from public.users p where p.id = a.id)
    order by a.created_at, a.id
  loop
    if account.username ~ '^[a-z0-9_]{3,30}$' then
      insert into public.users (id, username)
      values (account.id, account.username)
      on conflict do nothing;
    end if;

    while not exists (select 1 from public.users where id = account.id) loop
      profile_username := 'user_' || left(replace(gen_random_uuid()::text, '-', ''), 25);
      insert into public.users (id, username)
      values (account.id, profile_username)
      on conflict do nothing;
    end loop;
  end loop;
end
$$;

commit;
