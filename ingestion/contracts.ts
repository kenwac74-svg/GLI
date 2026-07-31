import type { NormalizationInput } from "./normalize.ts";

export type RawSnapshotMetadata = {
  sourceUrl: string;
  sourceUrlHash: string;
  contentHash: string;
  objectKey: string;
  httpStatus: number;
  fetchedAt: number;
};

export type CollectedListingBatch = {
  candidates: readonly NormalizationInput[];
  snapshot?: RawSnapshotMetadata;
};

export type RawObjectStore = {
  put: (
    key: string,
    value: Uint8Array,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    },
  ) => Promise<unknown>;
};
