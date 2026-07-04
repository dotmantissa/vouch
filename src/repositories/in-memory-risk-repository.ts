import type {
  AgentProfile,
  FundingEdge,
  ListingSimilarityHit,
  RatingFarmHit,
  RatingRecord,
  SharedFundingHit,
  SybilRiskRepository
} from '../domain/sybil/types.js';

function normalizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(normalizeText(a));
  const setB = new Set(normalizeText(b));
  const intersection = new Set([...setA].filter((token) => setB.has(token)));
  const union = new Set([...setA, ...setB]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

export class InMemorySybilRiskRepository implements SybilRiskRepository {
  private readonly agents: AgentProfile[] = [
    {
      agentId: 'agent_alpha',
      walletAddress: '0xAlphaWallet',
      listingText: 'Cross-chain market making and routing intelligence for xlayer liquidity and stable execution.',
      registeredAtBlock: 100
    },
    {
      agentId: 'agent_alpha_clone',
      walletAddress: '0xAlphaCloneWallet',
      listingText: 'Cross chain market making and routing intelligence for xlayer liquidity and stable execution',
      registeredAtBlock: 101
    },
    {
      agentId: 'agent_alpha_farm',
      walletAddress: '0xAlphaFarmWallet',
      listingText: 'Autonomous trade routing and best execution for xlayer and base stablecoin orderflow.',
      registeredAtBlock: 100
    },
    {
      agentId: 'agent_bespoke',
      walletAddress: '0xBespokeWallet',
      listingText: 'Custom logo design agent focused on fintech brand systems and responsive motion mockups.',
      registeredAtBlock: 220
    }
  ];

  private readonly fundingEdges: FundingEdge[] = [
    { fromWallet: '0xTreasuryA', toWallet: '0xFundingHub1', txHash: '0xfund1', blockNumber: 95 },
    { fromWallet: '0xFundingHub1', toWallet: '0xAlphaWallet', txHash: '0xfund2', blockNumber: 96 },
    { fromWallet: '0xFundingHub1', toWallet: '0xAlphaCloneWallet', txHash: '0xfund3', blockNumber: 96 },
    { fromWallet: '0xFundingHub1', toWallet: '0xAlphaFarmWallet', txHash: '0xfund4', blockNumber: 100 },
    { fromWallet: '0xIndependentTreasury', toWallet: '0xBespokeWallet', txHash: '0xfund5', blockNumber: 219 }
  ];

  private readonly ratings: RatingRecord[] = [
    { reviewerWallet: '0xAlphaWallet', ratedAgentId: 'agent_alpha', blockNumber: 100, rating: 5 },
    { reviewerWallet: '0xAlphaCloneWallet', ratedAgentId: 'agent_alpha', blockNumber: 100, rating: 5 },
    { reviewerWallet: '0xBespokeWallet', ratedAgentId: 'agent_bespoke', blockNumber: 250, rating: 5 }
  ];

  async getAgent(agentId: string): Promise<AgentProfile | null> {
    return this.agents.find((agent) => agent.agentId === agentId) ?? null;
  }

  async findSharedFunding(agentId: string, maxHops: number): Promise<SharedFundingHit[]> {
    const target = this.agents.find((agent) => agent.agentId === agentId);
    if (!target) {
      return [];
    }

    const targetAncestors = this.getAncestorWallets(target.walletAddress, maxHops);
    const relatedAgents = this.agents.filter((agent) => agent.agentId !== agentId);
    const hits = new Map<string, SharedFundingHit>();

    for (const agent of relatedAgents) {
      const relatedAncestors = this.getAncestorWallets(agent.walletAddress, maxHops);
      for (const [wallet, hopCount] of targetAncestors.entries()) {
        if (!relatedAncestors.has(wallet)) {
          continue;
        }

        const existing = hits.get(wallet);
        if (existing) {
          existing.relatedAgents.push(agent.agentId);
          continue;
        }

        hits.set(wallet, {
          ancestorWallet: wallet,
          hopCount,
          relatedAgents: [agent.agentId]
        });
      }
    }

    return [...hits.values()].filter((hit) => hit.relatedAgents.length > 0);
  }

  async findListingSimilarity(agentId: string, threshold: number): Promise<ListingSimilarityHit[]> {
    const target = this.agents.find((agent) => agent.agentId === agentId);
    if (!target) {
      return [];
    }

    return this.agents
      .filter((agent) => agent.agentId !== agentId)
      .map((agent) => ({
        relatedAgent: agent.agentId,
        similarity: jaccardSimilarity(target.listingText, agent.listingText)
      }))
      .filter((hit) => hit.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);
  }

  async findRatingFarming(agentId: string): Promise<RatingFarmHit[]> {
    const target = this.agents.find((agent) => agent.agentId === agentId);
    if (!target) {
      return [];
    }

    const suspiciousRatings = this.ratings.filter(
      (rating) => rating.ratedAgentId === agentId && rating.blockNumber === target.registeredAtBlock
    );

    if (suspiciousRatings.length === 0) {
      return [];
    }

    const relatedAgents = suspiciousRatings
      .map((rating) => this.agents.find((agent) => agent.walletAddress === rating.reviewerWallet)?.agentId)
      .filter((agentId): agentId is string => Boolean(agentId));

    return [
      {
        relatedAgents,
        detail: '5-star ratings from wallets funded in the same registration block',
        blockNumber: target.registeredAtBlock
      }
    ];
  }

  private getAncestorWallets(walletAddress: string, maxHops: number): Map<string, number> {
    const discovered = new Map<string, number>();
    const queue: Array<{ wallet: string; hops: number }> = [{ wallet: walletAddress, hops: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      if (current.hops >= maxHops) {
        continue;
      }

      const incomingEdges = this.fundingEdges.filter((edge) => edge.toWallet === current.wallet);
      for (const edge of incomingEdges) {
        const nextHop = current.hops + 1;
        if (discovered.has(edge.fromWallet) && discovered.get(edge.fromWallet)! <= nextHop) {
          continue;
        }

        discovered.set(edge.fromWallet, nextHop);
        queue.push({ wallet: edge.fromWallet, hops: nextHop });
      }
    }

    return discovered;
  }
}
