begin;

do $$
declare
  first_user constant uuid := '00000000-0000-0000-0000-000000000011';
  second_user constant uuid := '00000000-0000-0000-0000-000000000012';
begin
  insert into auth.users (id, raw_user_meta_data)
  values (first_user, '{"username":"  Alice_1  "}');

  if not exists (
    select 1 from public.users where id = first_user and username = 'alice_1'
  ) then
    raise exception 'Signup did not create the normalized profile';
  end if;

  begin
    insert into auth.users (id, raw_user_meta_data)
    values (second_user, '{"username":"ALICE_1"}');
    raise exception 'Signup accepted a duplicate username';
  exception when unique_violation then null;
  end;

  if exists (select 1 from auth.users where id = second_user) then
    raise exception 'Signup left an account without a profile';
  end if;
end
$$;

rollback;
