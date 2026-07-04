import { createPrivateKey, generateKeyPairSync, sign } from 'node:crypto';
import type { CapabilityCertSigner } from '../domain/capability/types.js';

export class DevEcdsaSigner implements CapabilityCertSigner {
  private readonly privateKey: ReturnType<typeof createPrivateKey>;

  constructor(privateKeyPem?: string) {
    if (privateKeyPem) {
      this.privateKey = createPrivateKey(privateKeyPem);
      return;
    }

    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
    this.privateKey = privateKey;
  }

  async sign(payload: string): Promise<string> {
    return sign('sha256', Buffer.from(payload), this.privateKey).toString('base64');
  }
}
