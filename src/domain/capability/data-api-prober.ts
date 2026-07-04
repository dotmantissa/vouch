import type { ProbeResult } from './types.js';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDataApiShape(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }

  const record = payload as Record<string, unknown>;
  return 'data' in record || 'result' in record || 'items' in record;
}

export async function runDataApiProbes(args: {
  targetEndpoint: string;
  uptimeRequests: number;
  uptimeIntervalMs: number;
  fetchImpl?: typeof fetch;
}): Promise<ProbeResult[]> {
  const fetchImpl = args.fetchImpl ?? fetch;

  const latencyStart = performance.now();
  const latencyResponse = await fetchImpl(args.targetEndpoint, {
    method: 'GET',
    headers: {
      accept: 'application/json'
    }
  });
  const latencyMs = Math.round(performance.now() - latencyStart);

  let schemaConformance: 'pass' | 'fail' = 'fail';
  try {
    const json = await latencyResponse.clone().json();
    if (latencyResponse.ok && isDataApiShape(json)) {
      schemaConformance = 'pass';
    }
  } catch {
    schemaConformance = 'fail';
  }

  let successes = latencyResponse.ok ? 1 : 0;
  for (let index = 1; index < args.uptimeRequests; index += 1) {
    if (args.uptimeIntervalMs > 0) {
      await delay(args.uptimeIntervalMs);
    }

    try {
      const response = await fetchImpl(args.targetEndpoint, {
        method: 'GET',
        headers: {
          accept: 'application/json'
        }
      });
      if (response.ok) {
        successes += 1;
      }
    } catch {
      // keep failure count implicit in success ratio
    }
  }

  const uptimePct = Math.round((successes / args.uptimeRequests) * 10000) / 100;

  return [
    { probe: 'latency_ms', value: latencyMs },
    { probe: 'uptime_30s_pct', value: uptimePct },
    { probe: 'schema_conformance', value: schemaConformance }
  ];
}
