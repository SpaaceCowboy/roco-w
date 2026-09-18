export type AdminAuthConfig = {
  baseUrl: string;
  secret: string;
  googleClientId: string;
  googleClientSecret: string;
  googleHostedDomain?: string;
};

const requiredKeys = [
  "ADMIN_AUTH_BASE_URL",
  "ADMIN_AUTH_SECRET",
  "ADMIN_GOOGLE_CLIENT_ID",
  "ADMIN_GOOGLE_CLIENT_SECRET",
] as const;

type Environment = Record<string, string | undefined>;

export function readAdminAuthConfig(environment: Environment = process.env): AdminAuthConfig | null {
  const configured = requiredKeys.filter((key) => Boolean(environment[key]));
  if (configured.length === 0) return null;

  const missing = requiredKeys.filter((key) => !environment[key]);
  if (missing.length > 0) {
    throw new Error(`Incomplete admin authentication configuration: missing ${missing.join(", ")}`);
  }

  const baseUrl = new URL(environment.ADMIN_AUTH_BASE_URL!);
  if (baseUrl.pathname !== "/" || baseUrl.search || baseUrl.hash) {
    throw new Error("ADMIN_AUTH_BASE_URL must be an origin without a path, query, or fragment");
  }
  if (baseUrl.protocol !== "https:" && baseUrl.hostname !== "localhost" && baseUrl.hostname !== "127.0.0.1") {
    throw new Error("ADMIN_AUTH_BASE_URL must use HTTPS outside local development");
  }

  const secret = environment.ADMIN_AUTH_SECRET!;
  if (secret.length < 32) throw new Error("ADMIN_AUTH_SECRET must contain at least 32 characters");

  return {
    baseUrl: baseUrl.origin,
    secret,
    googleClientId: environment.ADMIN_GOOGLE_CLIENT_ID!,
    googleClientSecret: environment.ADMIN_GOOGLE_CLIENT_SECRET!,
    googleHostedDomain: environment.ADMIN_GOOGLE_HOSTED_DOMAIN?.trim() || undefined,
  };
}

export function isAdminAuthConfigured(environment: Environment = process.env): boolean {
  return readAdminAuthConfig(environment) !== null;
}
