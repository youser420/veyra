-- Phase 3: continuous monitoring + trust incidents

alter table verification_runs
  add column if not exists run_type text default 'verification'
    check (run_type in ('verification', 'monitor'));

alter table agents
  add column if not exists monitor_enabled boolean default true,
  add column if not exists last_monitored_at timestamptz,
  add column if not exists next_monitor_at timestamptz;

create table if not exists trust_incidents (
  id uuid default uuid_generate_v4() primary key,
  agent_id uuid references agents(id) on delete cascade not null,
  creator_id uuid references profiles(id) on delete cascade not null,
  run_id uuid references verification_runs(id) on delete set null,
  incident_type text not null check (incident_type in (
    'score_drop', 'verify_failed', 'endpoint_unreachable', 'certificate_expired'
  )),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  title text not null,
  description text,
  previous_score integer,
  current_score integer,
  status text default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  auto_action text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

alter table trust_incidents enable row level security;

create policy "Creators read own incidents" on trust_incidents
  for select using (auth.uid() = creator_id);

create policy "Creators update own incidents" on trust_incidents
  for update using (auth.uid() = creator_id);

create index if not exists trust_incidents_creator_id_idx on trust_incidents (creator_id);
create index if not exists trust_incidents_agent_id_idx on trust_incidents (agent_id);
create index if not exists trust_incidents_status_idx on trust_incidents (status);
create index if not exists agents_next_monitor_at_idx on agents (next_monitor_at)
  where status = 'published' and monitor_enabled = true;
