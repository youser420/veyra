-- Google/GitHub sign-in: fill profile name and avatar from the provider's metadata.
-- Google sends full_name/name + avatar_url/picture; GitHub sends name/user_name + avatar_url.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, meta->>'email', ''),
    coalesce(
      nullif(meta->>'full_name', ''),
      nullif(meta->>'name', ''),
      nullif(meta->>'user_name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(meta->>'avatar_url', meta->>'picture')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(profiles.full_name, excluded.full_name),
    avatar_url = coalesce(profiles.avatar_url, excluded.avatar_url);
  return new;
end;
$$;
