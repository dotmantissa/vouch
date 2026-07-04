import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { serviceCatalog, type ServiceKey } from '../lib/service-catalog.js';

function buildAuthenticateHeader(serviceKey: ServiceKey, requirement: { asset: string; amount: string; payTo: string; network: string }) {
  return `Payment x402="1", service="${serviceKey}", asset="${requirement.asset}", amount="${requirement.amount}", network="${requirement.network}", payTo="${requirement.payTo}"`;
}

export function createX402PreHandler(app: FastifyInstance, serviceKey: ServiceKey) {
  return async function x402PreHandler(request: FastifyRequest, reply: FastifyReply) {
    if (!app.config.PAYMENTS_REQUIRED) {
      return;
    }

    const service = serviceCatalog[serviceKey];
    const requirement = app.x402Verifier.getRequirement(service);
    const verification = await app.x402Verifier.verify(request, service);

    if (verification.ok) {
      return;
    }

    reply.header('WWW-Authenticate', buildAuthenticateHeader(serviceKey, requirement));
    return reply.code(402).send({
      error: 'payment_required',
      code: verification.code,
      message: verification.message,
      x402Version: requirement.x402Version,
      service: service.key,
      route: service.route,
      price: {
        currency: 'USD',
        amount: service.usdPrice
      },
      payment: {
        scheme: 'exact',
        asset: requirement.asset,
        network: requirement.network,
        payTo: requirement.payTo
      },
      verifier: {
        provider: app.x402Verifier.mode === 'mock' ? 'mock-dev' : 'okx-payment-sdk',
        mode: app.x402Verifier.mode
      }
    });
  };
}
