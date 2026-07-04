import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeSybilCheck } from '../src/domain/sybil/compute-sybil-risk.js';
import { InMemorySybilRiskRepository } from '../src/repositories/in-memory-risk-repository.js';

describe('computeSybilCheck', () => {
  const repository = new InMemorySybilRiskRepository();

  it('flags the seeded synthetic cluster as high risk', async () => {
    const result = await computeSybilCheck('agent_alpha', repository, new Date('2026-07-04T00:00:00.000Z'));

    assert.equal(result.risk_level, 'high');
    assert.ok(result.signals.length >= 3);
    assert.ok(result.signals.some((signal) => signal.type === 'shared_funding_source'));
    assert.ok(result.signals.some((signal) => signal.type === 'near_identical_listing_text'));
    assert.ok(result.signals.some((signal) => signal.type === 'rating_farming_pattern'));
  });

  it('returns low risk for an unrelated agent', async () => {
    const result = await computeSybilCheck('agent_bespoke', repository, new Date('2026-07-04T00:00:00.000Z'));

    assert.equal(result.risk_level, 'low');
    assert.deepEqual(result.signals, []);
  });

  it('handles unknown agents without inventing signals', async () => {
    const result = await computeSybilCheck('missing_agent', repository, new Date('2026-07-04T00:00:00.000Z'));

    assert.deepEqual(result, {
      agent_id: 'missing_agent',
      risk_level: 'low',
      signals: [],
      computed_at: '2026-07-04T00:00:00.000Z'
    });
  });
});
