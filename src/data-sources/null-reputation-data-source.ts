import type { ReputationDataSource, ReputationSignalsResult } from '../domain/trust/types.js';

export class NullReputationDataSource implements ReputationDataSource {
  async getReputationSignals(_agentId: string): Promise<ReputationSignalsResult> {
    return { available: false };
  }
}
