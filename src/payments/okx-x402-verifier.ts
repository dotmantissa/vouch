import type { FastifyRequest } from 'fastify';
import type { ServiceDefinition } from '../lib/service-catalog.js';
import type { PaymentRequirement, PaymentVerificationResult, X402Verifier } from './types.js';

export class OkxX402Verifier implements X402Verifier {
  readonly mode = 'okx' as const;

  constructor(
    private readonly args: {
      asset: string;
      network: string;
      payTo: string;
    }
  ) {}

  getRequirement(service: ServiceDefinition): PaymentRequirement {
    return {
      x402Version: '1',
      asset: this.args.asset,
      amount: service.usdPrice,
      network: this.args.network,
      payTo: this.args.payTo
    };
  }

  async verify(_request: FastifyRequest, _service: ServiceDefinition): Promise<PaymentVerificationResult> {
    return {
      ok: false,
      code: 'verifier_unavailable',
      message: 'OKX x402 verification mode is configured but the live Payment SDK integration is not wired yet.'
    };
  }
}
