import type { FastifyRequest } from 'fastify';
import type { ServiceDefinition } from '../lib/service-catalog.js';

export type PaymentRequirement = {
  x402Version: '1';
  asset: string;
  amount: string;
  network: string;
  payTo: string;
};

export type PaymentVerificationResult =
  | { ok: true }
  | { ok: false; code: 'missing_proof' | 'invalid_proof' | 'verifier_unavailable'; message: string };

export interface X402Verifier {
  readonly mode: 'mock' | 'okx';
  getRequirement(service: ServiceDefinition): PaymentRequirement;
  verify(request: FastifyRequest, service: ServiceDefinition): Promise<PaymentVerificationResult>;
}
