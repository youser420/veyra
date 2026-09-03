export type CheckStatus = "pending" | "running" | "passed" | "failed";

export interface Agent {
  id: string;
  name: string;
  description?: string;
  category: string;
  framework?: string;
  submission_method?: string;
  endpoint_url?: string;
  score?: number;
  status: string;
  tags?: string[];
  price_monthly_usd?: number;
  price_monthly_inr?: number;
  certificate_id?: string;
  certificate_issued_at?: string;
  certificate_expires_at?: string;
  archived_at?: string;
  published_at?: string;
}

export type AgentPrefill = Pick<
  Agent,
  "id" | "name" | "description" | "category" | "framework" | "submission_method" | "endpoint_url"
> & { config_file_path?: string };

export interface TrustIncident {
  id: string;
  agent_id: string;
  creator_id: string;
  run_id?: string;
  incident_type: string;
  severity: string;
  title: string;
  description?: string;
  previous_score?: number;
  current_score?: number;
  status: string;
  auto_action?: string;
  created_at: string;
  resolved_at?: string;
  agents?: { name?: string; category?: string };
}
