import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeTrustScore } from '../src/domain/trust/compute-trust-score.js';
import { NullReputationDataSource } from '../src/data-sources/null-reputation-data-source.js';
import { InMemorySybilRiskRepository } from '../src/repositories/in-memory-risk-repository.js';
import { InMemoryTrustScoreCache } from '../src/cache/in-memory-trust-score-cache.js';
import { getOrComputeTrustScore } from '../src/domain/trust/trust-score-service.js';

describe('computeTrustScore', () => {
  it('computes weighted scores when full data is available', () => {
    const result = computeTrustScore({
      agentId: 'agent_full',
      reputation: {
        available: true,
        signals: {
          completedDeals: 12,
          disputeWinRate: 0.8,
          repeatCustomerRate: 0.4,
          ratingAverage: 4.5
        }
      },
      trustContext: {
        walletAgeDays: 84,
        sharedFundingRelatedAgents: 0
      },
      now: new Date('2026-07-04T00:00:00.000Z')
    });

    assert.equal(result.score, 68);
    assert.equal(result.confidence, 'medium');
    assert.equal(result.components.rating_avg, 4.5);
    assert.equal(result.components.volume_score, 0.6);
    assert.equal(result.components.wallet_age_score, 0.23);
  });

  it('forces low confidence for low sample sizes even when the score is high', () => {
    const result = computeTrustScore({
      agentId: 'agent_small_sample',
      reputation: {
        available: true,
        signals: {
          completedDeals: 3,
          disputeWinRate: 1,
          repeatCustomerRate: 1,
          ratingAverage: 5
        }
      },
      trustContext: {
        walletAgeDays: 365,
        sharedFundingRelatedAgents: 0
      },
      now: new Date('2026-07-04T00:00:00.000Z')
    });

    assert.equal(result.confidence, 'low');
    assert.ok(result.flags.includes('low_sample_size'));
  });
});

describe('trust-score degradation path', () => {
  it('returns a degraded but structured response when no reputation data source is available', async () => {
    const result = await getOrComputeTrustScore({
      agentId: 'agent_alpha',
      requestingContext: 'a2a_negotiation',
      sybilRiskRepository: new InMemorySybilRiskRepository(),
      reputationDataSource: new NullReputationDataSource(),
      cache: new InMemoryTrustScoreCache(),
      now: new Date('2026-07-04T00:00:00.000Z')
    });

    assert.equal(result.score, null);
    assert.equal(result.confidence, 'unavailable');
    assert.deepEqual(result.flags, ['no_reputation_data_source']);
    assert.equal(result.components.wallet_age_days, 94);
    assert.equal(result.components.shared_funding_related_agents, 2);
    assert.equal(result.components.completed_deals, null);
    assert.equal(result.components.rating_avg, null);
  });
});
