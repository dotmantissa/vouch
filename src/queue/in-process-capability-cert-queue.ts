import type { CapabilityCertJob, CapabilityCertQueue, CapabilityCertSigner, CapabilityCertStore } from '../domain/capability/types.js';
import { processCapabilityCertJob } from '../domain/capability/capability-cert-service.js';

export class InProcessCapabilityCertQueue implements CapabilityCertQueue {
  constructor(
    private readonly args: {
      store: CapabilityCertStore;
      signer: CapabilityCertSigner;
      uptimeRequests: number;
      uptimeIntervalMs: number;
      fetchImpl?: typeof fetch;
    }
  ) {}

  async enqueue(job: CapabilityCertJob): Promise<void> {
    queueMicrotask(() => {
      void processCapabilityCertJob({
        job,
        store: this.args.store,
        signer: this.args.signer,
        uptimeRequests: this.args.uptimeRequests,
        uptimeIntervalMs: this.args.uptimeIntervalMs,
        fetchImpl: this.args.fetchImpl
      });
    });
  }
}
