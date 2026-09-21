export const adminRoles = ["admin", "editor", "reviewer"] as const;
export type AdminRole = (typeof adminRoles)[number];

export const adminPermissions = [
  "content:read",
  "content:write",
  "content:review",
  "content:publish",
  "content:archive",
  "content:delete",
  "media:write",
  "taxonomy:write",
  "users:manage",
  "audit:read",
] as const;

export type AdminPermission = (typeof adminPermissions)[number];

const rolePermissions: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  editor: new Set(["content:read", "content:write", "content:delete", "media:write"]),
  reviewer: new Set([
    "content:read",
    "content:write",
    "content:review",
    "content:publish",
    "content:archive",
    "content:delete",
    "media:write",
    "taxonomy:write",
    "audit:read",
  ]),
  admin: new Set(adminPermissions),
};

export function hasAdminPermission(role: AdminRole, permission: AdminPermission): boolean {
  return rolePermissions[role].has(permission);
}

export function requireAdminPermission(role: AdminRole, permission: AdminPermission): void {
  if (!hasAdminPermission(role, permission)) {
    throw new AdminAuthorizationError(role, permission);
  }
}

export class AdminAuthorizationError extends Error {
  constructor(
    readonly role: AdminRole,
    readonly permission: AdminPermission,
  ) {
    super(`Role ${role} does not have permission ${permission}`);
    this.name = "AdminAuthorizationError";
  }
}
