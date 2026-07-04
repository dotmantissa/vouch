import type { TrustScoreCache, TrustScoreResult } from '../domain/trust/types.js';

type CacheEntry = {
  expiresAt: number;
  value: TrustScoreResult;
};

export class InMemoryTrustScoreCache implements TrustScoreCache {
  private readonly entries = new Map<string, CacheEntry>();

  async get(key: string): Promise<TrustScoreResult | null> {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: TrustScoreResult, ttlMs: number): Promise<void> {
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }
}
