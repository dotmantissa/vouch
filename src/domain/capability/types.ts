export type CapabilityCertStatus = 'pending' | 'complete' | 'failed';
export type CapabilityCategory = 'data_api';

export type ProbeResult = {
  probe: 'latency_ms' | 'uptime_30s_pct' | 'schema_conformance';
  value: number | 'pass' | 'fail';
};

export type CapabilityCertRecord = {
  cert_id: string;
  target_endpoint: string;
  claimed_capability: CapabilityCategory;
  status: CapabilityCertStatus;
  probe_results: ProbeResult[] | null;
  issued_at: string | null;
  expires_at: string | null;
  signature: string | null;
  error: string | null;
};

export type CapabilityCertJob = {
  certId: string;
  targetEndpoint: string;
  claimedCapability: CapabilityCategory;
};

export interface CapabilityCertStore {
  createPending(input: { certId: string; targetEndpoint: string; claimedCapability: CapabilityCategory }): Promise<CapabilityCertRecord>;
  get(certId: string): Promise<CapabilityCertRecord | null>;
  markComplete(certId: string, update: Omit<CapabilityCertRecord, 'cert_id' | 'target_endpoint' | 'claimed_capability' | 'status'>): Promise<CapabilityCertRecord>;
  markFailed(certId: string, error: string): Promise<CapabilityCertRecord>;
}

export interface CapabilityCertQueue {
  enqueue(job: CapabilityCertJob): Promise<void>;
}

export interface CapabilityCertSigner {
  sign(payload: string): Promise<string>;
}
