import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createCapabilityCertId } from '../domain/capability/capability-cert-service.js';
import { createX402PreHandler } from '../plugins/x402.js';

const capabilityCertRequestSchema = z.object({
  target_endpoint: z.string().url(),
  claimed_capability: z.literal('data_api')
});

const capabilityCertParamsSchema = z.object({
  cert_id: z.string().min(1)
});

export async function registerCapabilityCertRoute(app: FastifyInstance) {
  app.post(
    '/capability-cert',
    {
      preHandler: createX402PreHandler(app.config, 'capability-cert')
    },
    async (request, reply) => {
      const body = capabilityCertRequestSchema.parse(request.body);
      const certId = createCapabilityCertId();

      await app.capabilityCertStore.createPending({
        certId,
        targetEndpoint: body.target_endpoint,
        claimedCapability: body.claimed_capability
      });

      await app.capabilityCertQueue.enqueue({
        certId,
        targetEndpoint: body.target_endpoint,
        claimedCapability: body.claimed_capability
      });

      return reply.code(202).send({
        cert_id: certId,
        status: 'pending',
        poll_url: `/capability-cert/${certId}`
      });
    }
  );

  app.get('/capability-cert/:cert_id', async (request, reply) => {
    const params = capabilityCertParamsSchema.parse(request.params);
    const record = await app.capabilityCertStore.get(params.cert_id);

    if (!record) {
      return reply.code(404).send({
        error: 'not_found',
        message: 'Capability certificate not found.'
      });
    }

    return record;
  });
}
