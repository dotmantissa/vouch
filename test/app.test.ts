import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, describe, it } from 'node:test';
import { buildApp } from '../src/app.js';

const testConfig = {
  NODE_ENV: 'test' as const,
  HOST: '127.0.0.1',
  PORT: 3000,
  LOG_LEVEL: 'silent' as const,
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/vouch',
  REDIS_URL: 'redis://localhost:6379',
  XLAYER_RPC_URL: 'https://rpc.xlayer.tech',
  OKX_AI_INDEXER_URL: undefined,
  OKX_PAYMENT_BASE_URL: undefined,
  VOUCH_SIGNING_PRIVATE_KEY: undefined,
  REPUTATION_DATA_SOURCE_MODE: 'null' as const,
  CAPABILITY_CERT_QUEUE_MODE: 'in-process' as const,
  CAPABILITY_UPTIME_REQUESTS: 5,
  CAPABILITY_UPTIME_INTERVAL_MS: 1,
  PAYMENTS_REQUIRED: false
};

const app = buildApp(testConfig);
let probeServer: ReturnType<typeof createServer>;
let probeBaseUrl = '';

async function waitForCompletion(certId: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const response = await app.inject({ method: 'GET', url: `/capability-cert/${certId}` });
    const payload = response.json();
    if (payload.status !== 'pending') {
      return payload;
    }

    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  throw new Error(`Timed out waiting for certificate ${certId}`);
}

describe('app routes', () => {
  before(async () => {
    probeServer = createServer((request, response) => {
      if (request.url === '/data') {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ data: { asset: 'BTC', price: 100_000 }, meta: { source: 'test' } }));
        return;
      }

      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'not_found' }));
    });

    await new Promise<void>((resolve) => {
      probeServer.listen(0, '127.0.0.1', () => resolve());
    });

    const address = probeServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Probe server failed to bind to an ephemeral port.');
    }

    probeBaseUrl = `http://127.0.0.1:${address.port}`;
    await app.ready();
  });

  after(async () => {
    await app.close();
    await new Promise<void>((resolve, reject) => {
      probeServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  it('serves health', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: 'ok' });
  });

  it('returns a sybil-check result', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/sybil-check',
      payload: { agent_id: 'agent_alpha' }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().risk_level, 'high');
  });

  it('returns a degraded trust-score response when no reputation data source is configured', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/trust-score',
      payload: { agent_id: 'agent_alpha', requesting_context: 'a2a_negotiation' }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().confidence, 'unavailable');
    assert.deepEqual(response.json().flags, ['no_reputation_data_source']);
  });

  it('creates and completes a capability certificate asynchronously', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/capability-cert',
      payload: {
        target_endpoint: `${probeBaseUrl}/data`,
        claimed_capability: 'data_api'
      }
    });

    assert.equal(createResponse.statusCode, 202);
    const createPayload = createResponse.json();
    assert.equal(createPayload.status, 'pending');
    assert.ok(typeof createPayload.cert_id === 'string');

    const completedPayload = await waitForCompletion(createPayload.cert_id);
    assert.equal(completedPayload.status, 'complete');
    assert.equal(completedPayload.claimed_capability, 'data_api');
    assert.ok(Array.isArray(completedPayload.probe_results));
    assert.ok(completedPayload.probe_results.some((probe: { probe: string; value: string }) => probe.probe === 'schema_conformance' && probe.value === 'pass'));
    assert.ok(typeof completedPayload.signature === 'string' && completedPayload.signature.length > 0);
    assert.ok(typeof completedPayload.expires_at === 'string' && completedPayload.expires_at.length > 0);
  });

  it('returns 402 when payments are required and proof is absent', async () => {
    const paidApp = buildApp({ ...testConfig, PAYMENTS_REQUIRED: true });

    await paidApp.ready();
    const response = await paidApp.inject({
      method: 'POST',
      url: '/sybil-check',
      payload: { agent_id: 'agent_alpha' }
    });

    assert.equal(response.statusCode, 402);
    assert.equal(response.json().service, 'sybil-check');
    await paidApp.close();
  });
});
