import type {
  RatingFarmHit,
  SharedFundingHit,
  ListingSimilarityHit,
  SybilCheckResult,
  SybilRiskRepository,
  SybilSignal
} from './types.js';

const SHARED_FUNDING_WEIGHT = 0.4;
const LISTING_SIMILARITY_WEIGHT = 0.35;
const RATING_FARMING_WEIGHT = 0.45;

function sharedFundingSignals(hits: SharedFundingHit[]): SybilSignal[] {
  return hits.map((hit) => ({
    type: 'shared_funding_source',
    related_agents: hit.relatedAgents,
    weight: SHARED_FUNDING_WEIGHT,
    detail: `Shared ancestor ${hit.ancestorWallet} within ${hit.hopCount} hop(s).`
  }));
}

function listingSimilaritySignals(hits: ListingSimilarityHit[]): SybilSignal[] {
  return hits.map((hit) => ({
    type: 'near_identical_listing_text',
    related_agent: hit.relatedAgent,
    similarity: Number(hit.similarity.toFixed(2)),
    weight: LISTING_SIMILARITY_WEIGHT
  }));
}

function ratingFarmingSignals(hits: RatingFarmHit[]): SybilSignal[] {
  return hits.map((hit) => ({
    type: 'rating_farming_pattern',
    related_agents: hit.relatedAgents,
    detail: `${hit.detail} (block ${hit.blockNumber})`,
    weight: RATING_FARMING_WEIGHT
  }));
}

export function aggregateRiskLevel(signals: SybilSignal[]): 'low' | 'medium' | 'high' {
  const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);

  if (totalWeight >= 0.75) {
    return 'high';
  }

  if (totalWeight >= 0.4) {
    return 'medium';
  }

  return 'low';
}

export async function computeSybilCheck(
  agentId: string,
  repository: SybilRiskRepository,
  now: Date = new Date()
): Promise<SybilCheckResult> {
  const agent = await repository.getAgent(agentId);
  if (!agent) {
    return {
      agent_id: agentId,
      risk_level: 'low',
      signals: [],
      computed_at: now.toISOString()
    };
  }

  const [sharedFunding, listingSimilarity, ratingFarming] = await Promise.all([
    repository.findSharedFunding(agentId, 2),
    repository.findListingSimilarity(agentId, 0.9),
    repository.findRatingFarming(agentId)
  ]);

  const signals = [
    ...sharedFundingSignals(sharedFunding),
    ...listingSimilaritySignals(listingSimilarity),
    ...ratingFarmingSignals(ratingFarming)
  ];

  return {
    agent_id: agentId,
    risk_level: aggregateRiskLevel(signals),
    signals,
    computed_at: now.toISOString()
  };
}
