import assert from 'node:assert/strict';
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
  PAYMENTS_REQUIRED: false
};

const app = buildApp(testConfig);

describe('app routes', () => {
  before(async () => {
    await app.ready();
  });

  after(async () => {
    await app.close();
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
