import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getOrComputeTrustScore } from '../domain/trust/trust-score-service.js';
import { createX402PreHandler } from '../plugins/x402.js';

const trustScoreRequestSchema = z.object({
  agent_id: z.string().min(1),
  requesting_context: z.string().min(1)
});

export async function registerTrustScoreRoute(app: FastifyInstance) {
  app.post(
    '/trust-score',
    {
      preHandler: createX402PreHandler(app, 'trust-score')
    },
    async (request) => {
      const body = trustScoreRequestSchema.parse(request.body);

      return getOrComputeTrustScore({
        agentId: body.agent_id,
        requestingContext: body.requesting_context,
        sybilRiskRepository: app.sybilRiskRepository,
        reputationDataSource: app.reputationDataSource,
        cache: app.trustScoreCache
      });
    }
  );
}
