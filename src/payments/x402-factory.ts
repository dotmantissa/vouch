import type { AppConfig } from '../lib/config.js';
import { MockX402Verifier } from './mock-x402-verifier.js';
import { OkxX402Verifier } from './okx-x402-verifier.js';
import type { X402Verifier } from './types.js';

export function createX402Verifier(config: AppConfig): X402Verifier {
  switch (config.X402_MODE) {
    case 'okx':
      return new OkxX402Verifier({
        asset: config.X402_ACCEPTED_ASSET,
        network: config.X402_NETWORK,
        payTo: config.X402_PAYMENT_ADDRESS
      });
    case 'mock':
    default:
      return new MockX402Verifier({
        asset: config.X402_ACCEPTED_ASSET,
        network: config.X402_NETWORK,
        payTo: config.X402_PAYMENT_ADDRESS,
        secret: config.X402_MOCK_SECRET
      });
  }
}
