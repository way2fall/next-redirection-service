export type DestinationRecord = {
  id: string;
  url: string;
  enabled: boolean;
  createdAt: string;
};

export type SlugRecord = {
  version: 2;
  slug: string;
  enabled: boolean;
  createdAt: string;
  destinations: DestinationRecord[];
};

export type SlugSummary = {
  slug: string;
  enabled: boolean;
  createdAt: string;
  totalClickCount: number;
  destinationCount: number;
  enabledDestinationCount: number;
};

export type DestinationWithClicks = DestinationRecord & { clickCount: number };

export type SlugDetails = {
  slug: string;
  enabled: boolean;
  createdAt: string;
  totalClickCount: number;
  roundRobinCursor: number;
  destinations: DestinationWithClicks[];
};

export type CreateSlugInput = {
  slug: string;
  destinationUrl: string;
};

export type AddDestinationInput = {
  slug: string;
  url: string;
};

export type EditDestinationInput = {
  slug: string;
  destinationId: string;
  url: string;
};

export type SetDestinationEnabledInput = {
  slug: string;
  destinationId: string;
  enabled: boolean;
};
