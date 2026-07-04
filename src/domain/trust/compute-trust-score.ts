import type { ReputationSignalsResult, TrustContext, TrustScoreResult } from './types.js';

export type ComputeTrustScoreInput = {
  agentId: string;
  reputation: ReputationSignalsResult;
  trustContext: TrustContext;
  now?: Date;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function deriveWalletAgeScore(walletAgeDays: number | null): number | null {
  if (walletAgeDays === null) {
    return null;
  }

  return round2(clamp01(walletAgeDays / 365));
}

function deriveVolumeScore(completedDeals: number): number {
  return round2(clamp01(completedDeals / 20));
}

function deriveConfidence(completedDeals: number): 'low' | 'medium' | 'high' {
  if (completedDeals < 5) {
    return 'low';
  }

  if (completedDeals < 20) {
    return 'medium';
  }

  return 'high';
}

export function computeTrustScore(input: ComputeTrustScoreInput): TrustScoreResult {
  const computedAt = (input.now ?? new Date()).toISOString();
  const walletAgeScore = deriveWalletAgeScore(input.trustContext.walletAgeDays);

  if (!input.reputation.available) {
    return {
      agent_id: input.agentId,
      score: null,
      confidence: 'unavailable',
      components: {
        dispute_win_rate: null,
        completed_deals: null,
        wallet_age_days: input.trustContext.walletAgeDays,
        repeat_customer_rate: null,
        rating_avg: null,
        wallet_age_score: walletAgeScore,
        volume_score: null,
        shared_funding_related_agents: input.trustContext.sharedFundingRelatedAgents
      },
      flags: ['no_reputation_data_source'],
      computed_at: computedAt
    };
  }

  const { completedDeals, disputeWinRate, repeatCustomerRate, ratingAverage } = input.reputation.signals;
  const volumeScore = deriveVolumeScore(completedDeals);
  const normalizedRating = round2(clamp01(ratingAverage / 5));
  const weightedScore =
    0.35 * normalizedRating +
    0.25 * clamp01(disputeWinRate) +
    0.2 * clamp01(repeatCustomerRate) +
    0.1 * (walletAgeScore ?? 0) +
    0.1 * volumeScore;

  const flags = input.trustContext.sharedFundingRelatedAgents > 0 ? ['shared_funding_detected'] : [];
  if (completedDeals < 5) {
    flags.push('low_sample_size');
  }

  return {
    agent_id: input.agentId,
    score: Math.round(weightedScore * 100),
    confidence: deriveConfidence(completedDeals),
    components: {
      dispute_win_rate: round2(clamp01(disputeWinRate)),
      completed_deals: completedDeals,
      wallet_age_days: input.trustContext.walletAgeDays,
      repeat_customer_rate: round2(clamp01(repeatCustomerRate)),
      rating_avg: round2(ratingAverage),
      wallet_age_score: walletAgeScore,
      volume_score: volumeScore,
      shared_funding_related_agents: input.trustContext.sharedFundingRelatedAgents
    },
    flags,
    computed_at: computedAt
  };
}
