import type {
  AddDestinationInput,
  CreateSlugInput,
  DeleteDestinationInput,
  EditDestinationInput,
  ResetDestinationClickCountInput,
  SetDestinationEnabledInput,
  SlugDetails,
  SlugRecord,
  SlugSummary
} from "./types";

export interface KvStore {
  // Redirect critical-path (Edge): keep this minimal.
  getRedirectConfig(
    slug: string
  ): Promise<{ enabled: boolean; destinations: Array<{ id: string; urls: string[]; enabled: boolean }> } | null>;
  nextRoundRobinCursor(slug: string): Promise<number>;
  recordRawHit(slug: string): Promise<void>;
  recordValidClick(slug: string, destinationId: string): Promise<void>;
  acquireValidClickDedupe(slug: string, fingerprint: string, windowSeconds: number): Promise<boolean>;

  // Admin (Node.js).
  getSlug(slug: string): Promise<SlugRecord | null>;
  createSlug(input: CreateSlugInput): Promise<SlugRecord>;
  deleteSlug(slug: string): Promise<void>;
  listSlugs(): Promise<SlugSummary[]>;
  setSlugEnabled(slug: string, enabled: boolean): Promise<void>;
  resetSlugClickCount(slug: string): Promise<void>;
  getSlugDetails(slug: string): Promise<SlugDetails | null>;

  addDestination(input: AddDestinationInput): Promise<SlugRecord>;
  editDestination(input: EditDestinationInput): Promise<SlugRecord>;
  setDestinationEnabled(input: SetDestinationEnabledInput): Promise<SlugRecord>;
  deleteDestination(input: DeleteDestinationInput): Promise<SlugRecord>;
  resetDestinationClickCount(input: ResetDestinationClickCountInput): Promise<void>;

  getFallbackHtml(): Promise<string | null>;
  setFallbackHtml(html: string): Promise<void>;
}
