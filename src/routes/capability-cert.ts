import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createX402PreHandler } from '../plugins/x402.js';

const capabilityCertRequestSchema = z.object({
  target_endpoint: z.string().url(),
  claimed_capability: z.string().min(1)
});

export async function registerCapabilityCertRoute(app: FastifyInstance) {
  app.post(
    '/capability-cert',
    {
      preHandler: createX402PreHandler(app.config, 'capability-cert')
    },
    async (request, reply) => {
      const body = capabilityCertRequestSchema.parse(request.body);

      return reply.code(501).send({
        error: 'not_implemented',
        phase: 'phase_4',
        message: 'capability-cert is intentionally deferred until the probe worker is in place.',
        request: body
      });
    }
  );
}
