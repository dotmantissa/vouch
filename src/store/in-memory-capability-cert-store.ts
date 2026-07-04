import type { CapabilityCertRecord, CapabilityCertStore } from '../domain/capability/types.js';

export class InMemoryCapabilityCertStore implements CapabilityCertStore {
  private readonly records = new Map<string, CapabilityCertRecord>();

  async createPending(input: { certId: string; targetEndpoint: string; claimedCapability: 'data_api' }): Promise<CapabilityCertRecord> {
    const record: CapabilityCertRecord = {
      cert_id: input.certId,
      target_endpoint: input.targetEndpoint,
      claimed_capability: input.claimedCapability,
      status: 'pending',
      probe_results: null,
      issued_at: null,
      expires_at: null,
      signature: null,
      error: null
    };

    this.records.set(input.certId, record);
    return record;
  }

  async get(certId: string): Promise<CapabilityCertRecord | null> {
    return this.records.get(certId) ?? null;
  }

  async markComplete(certId: string, update: Omit<CapabilityCertRecord, 'cert_id' | 'target_endpoint' | 'claimed_capability' | 'status'>): Promise<CapabilityCertRecord> {
    const existing = this.records.get(certId);
    if (!existing) {
      throw new Error(`Unknown cert_id: ${certId}`);
    }

    const record: CapabilityCertRecord = {
      ...existing,
      status: 'complete',
      ...update
    };

    this.records.set(certId, record);
    return record;
  }

  async markFailed(certId: string, error: string): Promise<CapabilityCertRecord> {
    const existing = this.records.get(certId);
    if (!existing) {
      throw new Error(`Unknown cert_id: ${certId}`);
    }

    const record: CapabilityCertRecord = {
      ...existing,
      status: 'failed',
      error
    };

    this.records.set(certId, record);
    return record;
  }
}
