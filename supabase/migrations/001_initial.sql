create extension if not exists "uuid-ossp";

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  role text default 'creator' check (role in ('creator', 'consumer', 'admin')),
  stripe_customer_id text,
  razorpay_customer_id text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users
for each row execute procedure handle_new_user();

create table agents (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  description text,
  category text not null,
  submission_method text check (submission_method in ('url', 'file', 'oauth')),
  endpoint_url text,
  config_file_path text,
  oauth_provider text,
  status text default 'pending' check (status in ('pending', 'verifying', 'verified', 'failed', 'published')),
  score integer check (score >= 0 and score <= 100),
  certificate_id text unique,
  certificate_issued_at timestamptz,
  certificate_expires_at timestamptz,
  published_at timestamptz,
  price_monthly_usd integer,
  price_monthly_inr integer,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table agents enable row level security;
create policy "Creators manage own agents" on agents for all using (auth.uid() = creator_id);
create policy "Anyone can read published agents" on agents for select using (status = 'published');

create table verification_runs (
  id uuid default uuid_generate_v4() primary key,
  agent_id uuid references agents(id) on delete cascade not null,
  started_at timestamptz default now(),
  completed_at timestamptz,
  final_score integer,
  status text default 'running' check (status in ('running', 'completed', 'failed'))
);
alter table verification_runs enable row level security;
create policy "Creators read own runs" on verification_runs for select using (exists (select 1 from agents where agents.id = agent_id and agents.creator_id = auth.uid()));

create table check_results (
  id uuid default uuid_generate_v4() primary key,
  run_id uuid references verification_runs(id) on delete cascade not null,
  check_name text not null,
  score integer,
  status text check (status in ('pending', 'running', 'passed', 'failed')),
  details jsonb,
  completed_at timestamptz
);
alter table check_results enable row level security;
create policy "Creators read own check results" on check_results for select using (exists (select 1 from verification_runs vr join agents a on a.id = vr.agent_id where vr.id = run_id and a.creator_id = auth.uid()));

create table subscriptions (
  id uuid default uuid_generate_v4() primary key,
  consumer_id uuid references profiles(id) on delete cascade not null,
  agent_id uuid references agents(id) on delete cascade not null,
  stripe_subscription_id text,
  razorpay_subscription_id text,
  payment_gateway text check (payment_gateway in ('stripe', 'razorpay')),
  status text default 'active' check (status in ('active', 'cancelled', 'past_due')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  unique(consumer_id, agent_id)
);
alter table subscriptions enable row level security;
create policy "Users manage own subscriptions" on subscriptions for all using (auth.uid() = consumer_id);

create table payouts (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references profiles(id) on delete cascade not null,
  agent_id uuid references agents(id),
  amount_usd integer,
  amount_inr integer,
  period_start date,
  period_end date,
  status text default 'pending' check (status in ('pending', 'processing', 'paid', 'failed')),
  paid_at timestamptz,
  created_at timestamptz default now()
);
alter table payouts enable row level security;
create policy "Creators read own payouts" on payouts for select using (auth.uid() = creator_id);

create table api_keys (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text default 'Default Key',
  key_hash text not null unique,
  prefix text not null,
  calls_used integer default 0,
  calls_limit integer default 5000,
  is_active boolean default true,
  last_used_at timestamptz,
  created_at timestamptz default now()
);
alter table api_keys enable row level security;
create policy "Users manage own API keys" on api_keys for all using (auth.uid() = user_id);

create index on agents(creator_id);
create index on agents(status);
create index on agents(category);
create index on verification_runs(agent_id);
create index on check_results(run_id);
create index on subscriptions(consumer_id);
create index on subscriptions(agent_id);
