import type { CreateLinkInput, LinkRecord } from "./types";

export interface KvStore {
  // Redirect critical-path: keep this minimal.
  getDestination(slug: string): Promise<string | null>;

  getLink(slug: string): Promise<LinkRecord | null>;
  setLink(input: CreateLinkInput): Promise<LinkRecord>;
  deleteLink(slug: string): Promise<void>;
  incrementClick(slug: string): Promise<void>;
  listLinks(): Promise<LinkRecord[]>;
}
