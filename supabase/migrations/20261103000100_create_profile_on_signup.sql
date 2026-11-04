begin;

create function public.create_profile_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_username text := lower(btrim(new.raw_user_meta_data ->> 'username'));
begin
  if profile_username is null or profile_username !~ '^[a-z0-9_]{3,30}$' then
    raise exception 'Invalid username';
  end if;

  insert into public.users (id, username)
  values (new.id, profile_username);

  return new;
end;
$$;

revoke all on function public.create_profile_on_signup() from public, anon, authenticated;

create trigger create_profile_after_signup
  after insert on auth.users
  for each row execute function public.create_profile_on_signup();

commit;
