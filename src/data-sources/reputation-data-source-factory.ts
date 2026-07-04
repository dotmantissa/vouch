import type { AppConfig } from '../lib/config.js';
import type { ReputationDataSource } from '../domain/trust/types.js';
import { NullReputationDataSource } from './null-reputation-data-source.js';

export function createReputationDataSource(config: AppConfig): ReputationDataSource {
  switch (config.REPUTATION_DATA_SOURCE_MODE) {
    case 'null':
    default:
      return new NullReputationDataSource();
  }
}
