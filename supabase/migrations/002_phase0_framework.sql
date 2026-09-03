-- Phase 0: framework adapters + verification snapshots

alter table agents
  add column if not exists framework text default 'generic_http'
    check (framework in (
      'generic_http', 'langchain', 'crewai', 'autogen', 'flowise', 'dify', 'make'
    ));

comment on column agents.framework is 'Which adapter invokes this agent during verification';
comment on column agents.oauth_provider is 'Legacy label; prefer framework for OAuth/connect flows';

alter table verification_runs
  add column if not exists snapshot_framework text,
  add column if not exists snapshot_endpoint_url text,
  add column if not exists snapshot_config_path text,
  add column if not exists submission_method text;

-- Marketplace: only non-expired published agents (optional DB view; API also filters in code)
create or replace view marketplace_agents
with (security_invoker = true)
as
  select *
  from agents
  where status = 'published'
    and (certificate_expires_at is null or certificate_expires_at > now());
