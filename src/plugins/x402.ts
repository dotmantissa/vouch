import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppConfig } from '../lib/config.js';
import { serviceCatalog, type ServiceKey } from '../lib/service-catalog.js';

const PAYMENT_HEADERS = ['x-payment', 'x402-payment', 'x-payment-proof'] as const;

export function createX402PreHandler(config: AppConfig, serviceKey: ServiceKey) {
  return async function x402PreHandler(request: FastifyRequest, reply: FastifyReply) {
    if (!config.PAYMENTS_REQUIRED) {
      return;
    }

    const hasPaymentHeader = PAYMENT_HEADERS.some((header) => request.headers[header] !== undefined);
    if (hasPaymentHeader) {
      return;
    }

    const service = serviceCatalog[serviceKey];
    return reply.code(402).send({
      error: 'payment_required',
      message: 'This endpoint requires x402 payment proof.',
      service: service.key,
      route: service.route,
      price: {
        currency: 'USD',
        amount: service.usdPrice
      },
      payment: {
        standard: 'x402',
        provider: 'okx-payment-sdk',
        verifierStatus: 'stubbed'
      }
    });
  };
}
