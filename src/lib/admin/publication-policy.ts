import type { AdminPermission } from "./permissions";

export const publicationActions = ["request_review", "return_to_draft", "publish", "schedule", "unpublish", "archive", "restore"] as const;
export type PublicationAction = (typeof publicationActions)[number];

export function publicationPermission(action: PublicationAction): AdminPermission {
  if (action === "request_review") return "content:write";
  if (action === "return_to_draft") return "content:review";
  if (action === "archive" || action === "restore") return "content:archive";
  return "content:publish";
}

export function allowedPublicationSourceStatuses(action: PublicationAction): readonly string[] {
  switch (action) {
    case "request_review": return ["draft"];
    case "return_to_draft": return ["review", "scheduled"];
    case "publish": return ["review", "scheduled"];
    case "schedule": return ["review"];
    case "unpublish": return ["published"];
    case "archive": return ["published"];
    case "restore": return ["archived"];
  }
}
