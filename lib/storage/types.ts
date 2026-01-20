export type LinkRecord = {
  slug: string;
  destination: string;
  createdAt: string;
  clickCount?: number;
};

export type CreateLinkInput = {
  slug: string;
  destination: string;
};

