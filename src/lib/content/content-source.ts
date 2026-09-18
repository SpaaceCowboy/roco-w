import "server-only";

import { databasePublishedContentRepository } from "./databaseRepository";
import { filePublishedContentRepository } from "./fileRepository";
import type { PublishedContentRepository } from "./repository";

export type ContentSource = "file" | "database";

export function contentSource(): ContentSource {
  const value = process.env.CONTENT_SOURCE ?? "file";
  if (value !== "file" && value !== "database") {
    throw new Error("CONTENT_SOURCE must be either 'file' or 'database'");
  }
  return value;
}

export function getPublishedContentRepository(): PublishedContentRepository {
  return contentSource() === "database" ? databasePublishedContentRepository : filePublishedContentRepository;
}
