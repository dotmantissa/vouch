CREATE TABLE agents (
  agent_id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL,
  listing_text TEXT,
  listing_embedding VECTOR(1536)
);

CREATE TABLE deals (
  deal_id TEXT PRIMARY KEY,
  provider_agent_id TEXT REFERENCES agents(agent_id),
  hirer_agent_id TEXT REFERENCES agents(agent_id),
  status TEXT,
  rating INT,
  created_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE funding_edges (
  from_wallet TEXT,
  to_wallet TEXT,
  tx_hash TEXT,
  block_number BIGINT
);

CREATE TABLE certs (
  cert_id TEXT PRIMARY KEY,
  target_endpoint TEXT,
  claimed_capability TEXT,
  probe_results JSONB,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  signature TEXT
);

CREATE TABLE trust_score_cache (
  agent_id TEXT PRIMARY KEY,
  score JSONB,
  computed_at TIMESTAMPTZ
);
