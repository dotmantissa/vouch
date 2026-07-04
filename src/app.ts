import Fastify from 'fastify';
import { ZodError } from 'zod';
import { loadConfig, type AppConfig } from './lib/config.js';
import { registerHealthRoute } from './routes/health.js';
import { registerTrustScoreRoute } from './routes/trust-score.js';
import { registerSybilCheckRoute } from './routes/sybil-check.js';
import { registerCapabilityCertRoute } from './routes/capability-cert.js';
import { InMemorySybilRiskRepository } from './repositories/in-memory-risk-repository.js';
import type { SybilRiskRepository } from './domain/sybil/types.js';
import type { ReputationDataSource, TrustScoreCache } from './domain/trust/types.js';
import { createReputationDataSource } from './data-sources/reputation-data-source-factory.js';
import { InMemoryTrustScoreCache } from './cache/in-memory-trust-score-cache.js';
import type { CapabilityCertQueue, CapabilityCertSigner, CapabilityCertStore } from './domain/capability/types.js';
import { InMemoryCapabilityCertStore } from './store/in-memory-capability-cert-store.js';
import { DevEcdsaSigner } from './signing/dev-ecdsa-signer.js';
import { InProcessCapabilityCertQueue } from './queue/in-process-capability-cert-queue.js';

type BuildAppOptions = {
  sybilRiskRepository?: SybilRiskRepository;
  reputationDataSource?: ReputationDataSource;
  trustScoreCache?: TrustScoreCache;
  capabilityCertStore?: CapabilityCertStore;
  capabilityCertSigner?: CapabilityCertSigner;
  capabilityCertQueue?: CapabilityCertQueue;
};

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    sybilRiskRepository: SybilRiskRepository;
    reputationDataSource: ReputationDataSource;
    trustScoreCache: TrustScoreCache;
    capabilityCertStore: CapabilityCertStore;
    capabilityCertSigner: CapabilityCertSigner;
    capabilityCertQueue: CapabilityCertQueue;
  }
}

export function buildApp(config: AppConfig = loadConfig(), options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL
    }
  });

  const capabilityCertStore = options.capabilityCertStore ?? new InMemoryCapabilityCertStore();
  const capabilityCertSigner = options.capabilityCertSigner ?? new DevEcdsaSigner(config.VOUCH_SIGNING_PRIVATE_KEY);
  const capabilityCertQueue =
    options.capabilityCertQueue ??
    new InProcessCapabilityCertQueue({
      store: capabilityCertStore,
      signer: capabilityCertSigner,
      uptimeRequests: config.CAPABILITY_UPTIME_REQUESTS,
      uptimeIntervalMs: config.CAPABILITY_UPTIME_INTERVAL_MS
    });

  app.decorate('config', config);
  app.decorate('sybilRiskRepository', options.sybilRiskRepository ?? new InMemorySybilRiskRepository());
  app.decorate('reputationDataSource', options.reputationDataSource ?? createReputationDataSource(config));
  app.decorate('trustScoreCache', options.trustScoreCache ?? new InMemoryTrustScoreCache());
  app.decorate('capabilityCertStore', capabilityCertStore);
  app.decorate('capabilityCertSigner', capabilityCertSigner);
  app.decorate('capabilityCertQueue', capabilityCertQueue);

  app.register(registerHealthRoute);
  app.register(registerTrustScoreRoute);
  app.register(registerSybilCheckRoute);
  app.register(registerCapabilityCertRoute);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: 'invalid_request',
        message: error.message
      });
    }

    app.log.error(error);
    return reply.code(500).send({
      error: 'internal_error',
      message: 'Unexpected server error.'
    });
  });

  return app;
}
