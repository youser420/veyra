-- Phase 2: agent lifecycle (archive, expiry queries)

alter table agents drop constraint if exists agents_status_check;

alter table agents
  add constraint agents_status_check
  check (status in (
    'pending', 'verifying', 'verified', 'failed', 'published', 'archived'
  ));

alter table agents add column if not exists archived_at timestamptz;

create index if not exists agents_certificate_expires_at_idx on agents (certificate_expires_at);

comment on column agents.archived_at is 'Set when creator archives an agent (soft delete)';
