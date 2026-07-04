export type RiskLevel = 'low' | 'medium' | 'high';

export type SybilSignal = {
  type: 'shared_funding_source' | 'near_identical_listing_text' | 'rating_farming_pattern';
  weight: number;
  related_agents?: string[];
  related_agent?: string;
  similarity?: number;
  detail?: string;
};

export type SybilCheckResult = {
  agent_id: string;
  risk_level: RiskLevel;
  signals: SybilSignal[];
  computed_at: string;
};

export type AgentProfile = {
  agentId: string;
  walletAddress: string;
  listingText: string;
  registeredAtBlock: number;
  firstSeenAt: Date | null;
};

export type FundingEdge = {
  fromWallet: string;
  toWallet: string;
  txHash: string;
  blockNumber: number;
};

export type RatingRecord = {
  reviewerWallet: string;
  ratedAgentId: string;
  blockNumber: number;
  rating: number;
};

export type SharedFundingHit = {
  ancestorWallet: string;
  relatedAgents: string[];
  hopCount: number;
};

export type ListingSimilarityHit = {
  relatedAgent: string;
  similarity: number;
};

export type RatingFarmHit = {
  relatedAgents: string[];
  detail: string;
  blockNumber: number;
};

export interface SybilRiskRepository {
  getAgent(agentId: string): Promise<AgentProfile | null>;
  findSharedFunding(agentId: string, maxHops: number): Promise<SharedFundingHit[]>;
  findListingSimilarity(agentId: string, threshold: number): Promise<ListingSimilarityHit[]>;
  findRatingFarming(agentId: string): Promise<RatingFarmHit[]>;
}
