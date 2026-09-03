-- Realtime progress UI: filtered postgres_changes requires full replica identity
alter table check_results replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'check_results'
  ) then
    alter publication supabase_realtime add table check_results;
  end if;
end $$;
