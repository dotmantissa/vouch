import { createHash, randomUUID } from 'node:crypto';
import { runDataApiProbes } from './data-api-prober.js';
import type { CapabilityCertJob, CapabilityCertRecord, CapabilityCertSigner, CapabilityCertStore } from './types.js';

function canonicalPayload(record: CapabilityCertRecord): string {
  return JSON.stringify({
    cert_id: record.cert_id,
    target_endpoint: record.target_endpoint,
    claimed_capability: record.claimed_capability,
    probe_results: record.probe_results,
    issued_at: record.issued_at,
    expires_at: record.expires_at
  });
}

export function createCapabilityCertId(): string {
  return `vch_cert_${randomUUID().replace(/-/g, '')}`;
}

export async function processCapabilityCertJob(args: {
  job: CapabilityCertJob;
  store: CapabilityCertStore;
  signer: CapabilityCertSigner;
  uptimeRequests: number;
  uptimeIntervalMs: number;
  fetchImpl?: typeof fetch;
  now?: Date;
}): Promise<CapabilityCertRecord> {
  try {
    const probeResults = await runDataApiProbes({
      targetEndpoint: args.job.targetEndpoint,
      uptimeRequests: args.uptimeRequests,
      uptimeIntervalMs: args.uptimeIntervalMs,
      fetchImpl: args.fetchImpl
    });

    const issuedAt = args.now ?? new Date();
    const expiresAt = new Date(issuedAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    const payloadRecord: CapabilityCertRecord = {
      cert_id: args.job.certId,
      target_endpoint: args.job.targetEndpoint,
      claimed_capability: args.job.claimedCapability,
      status: 'complete',
      probe_results: probeResults,
      issued_at: issuedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      signature: null,
      error: null
    };

    const digest = createHash('sha256').update(canonicalPayload(payloadRecord)).digest('hex');
    const signature = await args.signer.sign(digest);

    return args.store.markComplete(args.job.certId, {
      probe_results: probeResults,
      issued_at: issuedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      signature,
      error: null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Capability probe failed.';
    return args.store.markFailed(args.job.certId, message);
  }
}
