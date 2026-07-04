import Fastify from 'fastify';
import { ZodError } from 'zod';
import { loadConfig, type AppConfig } from './lib/config.js';
import { registerHealthRoute } from './routes/health.js';
import { registerTrustScoreRoute } from './routes/trust-score.js';
import { registerSybilCheckRoute } from './routes/sybil-check.js';
import { registerCapabilityCertRoute } from './routes/capability-cert.js';
import { InMemorySybilRiskRepository } from './repositories/in-memory-risk-repository.js';
import type { SybilRiskRepository } from './domain/sybil/types.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    sybilRiskRepository: SybilRiskRepository;
  }
}

export function buildApp(config: AppConfig = loadConfig()) {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL
    }
  });

  app.decorate('config', config);
  app.decorate('sybilRiskRepository', new InMemorySybilRiskRepository());

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
