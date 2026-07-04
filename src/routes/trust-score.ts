import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createX402PreHandler } from '../plugins/x402.js';

const trustScoreRequestSchema = z.object({
  agent_id: z.string().min(1),
  requesting_context: z.string().min(1)
});

export async function registerTrustScoreRoute(app: FastifyInstance) {
  app.post(
    '/trust-score',
    {
      preHandler: createX402PreHandler(app.config, 'trust-score')
    },
    async (request, reply) => {
      const body = trustScoreRequestSchema.parse(request.body);

      return reply.code(501).send({
        error: 'not_implemented',
        phase: 'phase_3',
        message: 'trust-score is planned next. Start with sybil-check for the first working slice.',
        request: body
      });
    }
  );
}
