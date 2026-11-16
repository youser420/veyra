-- Verification engine v2: explicit verdicts and an auditable run summary.
-- verdict: verified | failed | inconclusive (agent unreachable) | error (engine fault)
-- summary: gate reasons, probe set version, probe seed (reproducible), judge mode/model

alter table verification_runs
  add column if not exists verdict text
    check (verdict in ('verified', 'failed', 'inconclusive', 'error')),
  add column if not exists summary jsonb;

comment on column verification_runs.verdict is 'Engine verdict; a high score alone does not imply verified';
comment on column verification_runs.summary is 'Reasons, probe_set_version, seed, judge_mode, judge_model';
