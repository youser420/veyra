-- Supabase linter: views default to SECURITY DEFINER (runs as owner, bypasses caller RLS).
-- Recreate with security_invoker so queries use the caller's permissions + RLS.

drop view if exists public.marketplace_agents;

create view public.marketplace_agents
with (security_invoker = true)
as
  select *
  from agents
  where status = 'published'
    and (certificate_expires_at is null or certificate_expires_at > now());

comment on view public.marketplace_agents is
  'Published agents with valid certificates; respects agents RLS via security_invoker';
