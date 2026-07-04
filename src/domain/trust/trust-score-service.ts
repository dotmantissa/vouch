import type { SybilRiskRepository } from '../sybil/types.js';
import { computeTrustScore } from './compute-trust-score.js';
import type { ReputationDataSource, TrustScoreCache, TrustScoreResult } from './types.js';

const DEFAULT_TTL_MS = 60_000;

function diffDays(from: Date | null, to: Date): number | null {
  if (!from) {
    return null;
  }

  const diffMs = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

export async function getOrComputeTrustScore(args: {
  agentId: string;
  requestingContext: string;
  sybilRiskRepository: SybilRiskRepository;
  reputationDataSource: ReputationDataSource;
  cache: TrustScoreCache;
  now?: Date;
  ttlMs?: number;
}): Promise<TrustScoreResult> {
  const cacheKey = `${args.agentId}:${args.requestingContext}`;
  const cached = await args.cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const now = args.now ?? new Date();
  const [agent, sharedFunding, reputation] = await Promise.all([
    args.sybilRiskRepository.getAgent(args.agentId),
    args.sybilRiskRepository.findSharedFunding(args.agentId, 2),
    args.reputationDataSource.getReputationSignals(args.agentId)
  ]);

  const result = computeTrustScore({
    agentId: args.agentId,
    reputation,
    trustContext: {
      walletAgeDays: diffDays(agent?.firstSeenAt ?? null, now),
      sharedFundingRelatedAgents: new Set(sharedFunding.flatMap((hit) => hit.relatedAgents)).size
    },
    now
  });

  await args.cache.set(cacheKey, result, args.ttlMs ?? DEFAULT_TTL_MS);
  return result;
}
