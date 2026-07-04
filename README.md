# Vouch

Vouch is a trust infrastructure ASP for the OKX.AI agent marketplace. This working slice implements:

- a Fastify + TypeScript API skeleton
- x402-shaped payment gating with a stub verifier
- a working `POST /sybil-check` endpoint backed by explainable heuristics
- a working `POST /trust-score` endpoint with graceful degradation while marketplace reputation data is unavailable
- a working async `POST /capability-cert` flow for `data_api` services, plus polling via `GET /capability-cert/:cert_id`

## Current endpoints

- `GET /health`
- `POST /sybil-check`
- `POST /trust-score`
- `POST /capability-cert`
- `GET /capability-cert/:cert_id`

## Local run

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Server defaults to `http://localhost:3000`.

## Trust Score

`POST /trust-score` accepts:

```json
{ "agent_id": "agent_alpha", "requesting_context": "a2a_negotiation" }
```

The route is backed by a pure scoring module in `src/domain/trust/compute-trust-score.ts` and a `ReputationDataSource` abstraction. The default data source is `NullReputationDataSource` because there is not yet a confirmed public OKX AI marketplace API for deal history, dispute outcomes, or ratings.

When reputation data is unavailable, Vouch returns a structured degraded response:

- `score: null`
- `confidence: "unavailable"`
- reputation-dependent component fields as `null`
- independently knowable fields such as `wallet_age_days` and `shared_funding_related_agents`
- `flags: ["no_reputation_data_source"]`

This avoids inventing reputation values while keeping the response shape stable for calling agents.

## Capability Cert

`POST /capability-cert` currently supports one probe category only:

```json
{ "target_endpoint": "https://service.example/data", "claimed_capability": "data_api" }
```

Behavior:

- returns `202` immediately with `cert_id` and `poll_url`
- runs probes asynchronously in the default `in-process` queue mode
- probes `latency_ms`, `uptime_30s_pct`, and `schema_conformance`
- signs the completed certificate with a dev ECDSA signer
- stores the result in an in-memory certificate store
- exposes the final cert via `GET /capability-cert/:cert_id`
- sets `expires_at` to 7 days after issuance

Current `data_api` schema conformance expects a JSON object containing at least one of: `data`, `result`, or `items`.

## Sybil Check

`POST /sybil-check` accepts:

```json
{ "agent_id": "agent_alpha" }
```

Current heuristics:

- shared funding ancestry within 2 hops
- near-identical listing text using Jaccard similarity
- same-block rating farming patterns

## x402 Mode

`PAYMENTS_REQUIRED=false` by default for local development. The current payment gate returns a 402-shaped response when enabled, but full proof verification is implemented in a later phase.

## Next build steps

1. Replace x402 stub behavior with the verifier interface and dev/mock verification mode.
2. Wire BullMQ as an alternate capability-cert queue backend when Redis is available.
3. Wire a real reputation data source when OKX AI marketplace history APIs are confirmed.
4. Move trust-score cache and capability-cert persistence from in-memory adapters to Redis/Postgres.
