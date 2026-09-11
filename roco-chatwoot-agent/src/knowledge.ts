import { readFileSync } from "node:fs";

function readKnowledgeFile(name: string): string {
  return readFileSync(new URL(`../knowledge/${name}`, import.meta.url), "utf8").trim();
}

export const ROCO_KNOWLEDGE = readKnowledgeFile("roco.md");

export const SYSTEM_POLICY = readKnowledgeFile("policy.md").replace(
  "{{ROCO_KNOWLEDGE}}",
  ROCO_KNOWLEDGE,
);
