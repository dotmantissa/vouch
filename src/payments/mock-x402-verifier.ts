import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import type { ServiceDefinition } from '../lib/service-catalog.js';
import type { PaymentRequirement, PaymentVerificationResult, X402Verifier } from './types.js';

const PAYMENT_PROOF_HEADER = 'x-payment-proof';

type MockProofPayload = {
  service: string;
  asset: string;
  amount: string;
  network: string;
  payTo: string;
  nonce: string;
  signature: string;
};

function canonicalize(payload: Omit<MockProofPayload, 'signature'>): string {
  return [payload.service, payload.asset, payload.amount, payload.network, payload.payTo, payload.nonce].join('|');
}

function signPayload(payload: Omit<MockProofPayload, 'signature'>, secret: string): string {
  return createHmac('sha256', secret).update(canonicalize(payload)).digest('hex');
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function safeHexEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createMockX402Proof(args: {
  service: ServiceDefinition;
  asset: string;
  amount: string;
  network: string;
  payTo: string;
  secret: string;
  nonce?: string;
}): string {
  const payload = {
    service: args.service.key,
    asset: args.asset,
    amount: args.amount,
    network: args.network,
    payTo: args.payTo,
    nonce: args.nonce ?? 'dev-nonce'
  };

  const proof: MockProofPayload = {
    ...payload,
    signature: signPayload(payload, args.secret)
  };

  return encodeBase64Url(JSON.stringify(proof));
}

export class MockX402Verifier implements X402Verifier {
  readonly mode = 'mock' as const;

  constructor(
    private readonly args: {
      asset: string;
      network: string;
      payTo: string;
      secret: string;
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

  async verify(request: FastifyRequest, service: ServiceDefinition): Promise<PaymentVerificationResult> {
    const rawHeader = request.headers[PAYMENT_PROOF_HEADER];
    if (typeof rawHeader !== 'string' || rawHeader.length === 0) {
      return {
        ok: false,
        code: 'missing_proof',
        message: 'Missing x402 payment proof.'
      };
    }

    let payload: MockProofPayload;
    try {
      payload = JSON.parse(decodeBase64Url(rawHeader)) as MockProofPayload;
    } catch {
      return {
        ok: false,
        code: 'invalid_proof',
        message: 'Payment proof is not valid base64url JSON.'
      };
    }

    const expected = this.getRequirement(service);
    if (
      payload.service !== service.key ||
      payload.asset !== expected.asset ||
      payload.amount !== expected.amount ||
      payload.network !== expected.network ||
      payload.payTo !== expected.payTo ||
      !payload.nonce
    ) {
      return {
        ok: false,
        code: 'invalid_proof',
        message: 'Payment proof fields do not match the required payment terms.'
      };
    }

    const expectedSignature = signPayload(
      {
        service: payload.service,
        asset: payload.asset,
        amount: payload.amount,
        network: payload.network,
        payTo: payload.payTo,
        nonce: payload.nonce
      },
      this.args.secret
    );

    if (!safeHexEqual(payload.signature, expectedSignature)) {
      return {
        ok: false,
        code: 'invalid_proof',
        message: 'Payment proof signature is invalid.'
      };
    }

    return { ok: true };
  }
}
