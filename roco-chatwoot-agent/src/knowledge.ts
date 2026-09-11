import { readFileSync } from "node:fs";

type KnowledgeMetadata = {
  owner: string;
  status: "approved" | "draft" | "expired";
  last_reviewed: string;
  review_after: string;
  sources: string[];
};

function readKnowledgeFile(name: string): string {
  return readFileSync(new URL(`../knowledge/${name}`, import.meta.url), "utf8").trim();
}

export const ROCO_KNOWLEDGE = readKnowledgeFile("roco.md");

const metadata = JSON.parse(readKnowledgeFile("metadata.json")) as KnowledgeMetadata;
if (metadata.status !== "approved") throw new Error(`Knowledge status is ${metadata.status}; approved content is required`);
if (!metadata.owner || !metadata.last_reviewed || !metadata.review_after || !metadata.sources.length) {
  throw new Error("Knowledge metadata is incomplete");
}
if (metadata.review_after < new Date().toISOString().slice(0, 10)) {
  console.warn(`[knowledge] review overdue owner=${metadata.owner} review_after=${metadata.review_after}`);
}

export const SYSTEM_POLICY = readKnowledgeFile("policy.md").replace(
  "{{ROCO_KNOWLEDGE}}",
  ROCO_KNOWLEDGE,
);
