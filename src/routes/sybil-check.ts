import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { computeSybilCheck } from '../domain/sybil/compute-sybil-risk.js';
import { createX402PreHandler } from '../plugins/x402.js';

const sybilCheckRequestSchema = z.object({
  agent_id: z.string().min(1)
});

export async function registerSybilCheckRoute(app: FastifyInstance) {
  app.post(
    '/sybil-check',
    {
      preHandler: createX402PreHandler(app.config, 'sybil-check')
    },
    async (request) => {
      const body = sybilCheckRequestSchema.parse(request.body);
      return computeSybilCheck(body.agent_id, app.sybilRiskRepository);
    }
  );
}
