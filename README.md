# Vouch

Vouch is a trust infrastructure ASP for the OKX.AI agent marketplace. This working slice implements:

- a Fastify + TypeScript API skeleton
- x402 payment gating with a verifier interface and mock/dev verification mode
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

## x402 Mode

All paid routes share the same x402 gate and route-specific pricing:

- `sybil-check`: `$0.05`
- `trust-score`: `$0.03`
- `capability-cert`: `$1.50`

`PAYMENTS_REQUIRED=false` by default for local development. Set `PAYMENTS_REQUIRED=true` to enforce payment checks.

`X402_MODE=mock` is the default implementation in this environment. It verifies a base64url JSON proof in the `x-payment-proof` header using an HMAC over the exact route payment terms. This is intentionally named mock/dev mode so the live OKX Payment SDK verifier can replace it behind the same `X402Verifier` interface without changing route handlers.

When no valid proof is present, routes return HTTP `402` with:

- `x402Version`
- per-route `price`
- accepted `asset`
- `network`
- `payTo`
- `WWW-Authenticate` payment challenge header

`X402_MODE=okx` currently returns `verifier_unavailable` until live OKX Payment SDK credentials/integration are wired.

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

## Next build steps

1. Wire live OKX Payment SDK verification behind `X402_MODE=okx`.
2. Wire BullMQ as an alternate capability-cert queue backend when Redis is available.
3. Wire a real reputation data source when OKX AI marketplace history APIs are confirmed.
4. Move trust-score cache and capability-cert persistence from in-memory adapters to Redis/Postgres.
