export type ServiceKey = 'trust-score' | 'sybil-check' | 'capability-cert';

export type ServiceDefinition = {
  key: ServiceKey;
  route: string;
  usdPrice: string;
  description: string;
};

export const serviceCatalog: Record<ServiceKey, ServiceDefinition> = {
  'trust-score': {
    key: 'trust-score',
    route: '/trust-score',
    usdPrice: '0.03',
    description: 'Aggregate reputation lookup with transparent confidence flags.'
  },
  'sybil-check': {
    key: 'sybil-check',
    route: '/sybil-check',
    usdPrice: '0.05',
    description: 'Identity clustering risk analysis across funding, listings, and rating patterns.'
  },
  'capability-cert': {
    key: 'capability-cert',
    route: '/capability-cert',
    usdPrice: '1.50',
    description: 'Async capability probing that issues a signed performance certificate.'
  }
};
