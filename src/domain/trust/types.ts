export type TrustConfidence = 'unavailable' | 'low' | 'medium' | 'high';

export type ReputationSignals = {
  completedDeals: number;
  disputeWinRate: number;
  repeatCustomerRate: number;
  ratingAverage: number;
};

export type ReputationSignalsResult =
  | { available: false }
  | {
      available: true;
      signals: ReputationSignals;
    };

export type TrustContext = {
  walletAgeDays: number | null;
  sharedFundingRelatedAgents: number;
};

export type TrustScoreComponents = {
  dispute_win_rate: number | null;
  completed_deals: number | null;
  wallet_age_days: number | null;
  repeat_customer_rate: number | null;
  rating_avg: number | null;
  wallet_age_score: number | null;
  volume_score: number | null;
  shared_funding_related_agents: number | null;
};

export type TrustScoreResult = {
  agent_id: string;
  score: number | null;
  confidence: TrustConfidence;
  components: TrustScoreComponents;
  flags: string[];
  computed_at: string;
};

export interface ReputationDataSource {
  getReputationSignals(agentId: string): Promise<ReputationSignalsResult>;
}

export interface TrustScoreCache {
  get(key: string): Promise<TrustScoreResult | null>;
  set(key: string, value: TrustScoreResult, ttlMs: number): Promise<void>;
}
