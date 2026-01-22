export type DestinationRecord = {
  id: string;
  name: string;
  urls: string[];
  enabled: boolean;
  createdAt: string;
};

export type SlugRecord = {
  version: 3;
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
  destinationName: string;
  destinationUrls: string[];
};

export type AddDestinationInput = {
  slug: string;
  name: string;
  urls: string[];
};

export type EditDestinationInput = {
  slug: string;
  destinationId: string;
  name: string;
  urls: string[];
};

export type SetDestinationEnabledInput = {
  slug: string;
  destinationId: string;
  enabled: boolean;
};

export type DeleteDestinationInput = {
  slug: string;
  destinationId: string;
};

export type ResetDestinationClickCountInput = {
  slug: string;
  destinationId: string;
};
