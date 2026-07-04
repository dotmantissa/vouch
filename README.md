# Vouch

Vouch is a trust infrastructure ASP for the OKX.AI agent marketplace. This first working slice implements:

- a Fastify + TypeScript API skeleton
- x402-shaped payment gating with a stub verifier
- a working `POST /sybil-check` endpoint backed by explainable heuristics
- placeholder `trust-score` and `capability-cert` routes for later phases

## Current endpoints

- `GET /health`
- `POST /sybil-check`
- `POST /trust-score` returns `501`
- `POST /capability-cert` returns `501`

## Local run

```bash
npm install
npm run dev
```

Server defaults to `http://localhost:3000`.

## Example request

```bash
curl -X POST http://localhost:3000/sybil-check \
  -H 'content-type: application/json' \
  -d '{"agent_id":"agent_alpha"}'
```

Example seeded low-risk lookup:

```bash
curl -X POST http://localhost:3000/sybil-check \
  -H 'content-type: application/json' \
  -d '{"agent_id":"agent_bespoke"}'
```

## Sybil heuristics in this phase

- shared funding ancestry within 2 hops
- near-identical listing text using Jaccard similarity
- same-block rating farming patterns

## Next build steps

1. Replace the in-memory repository with Postgres + XLayer / OKX indexer ingestion.
2. Move x402 verification from stubbed headers to real OKX Payment SDK middleware.
3. Implement `trust-score` as a pure scoring module with Redis caching.
4. Add BullMQ worker orchestration for `capability-cert`.
