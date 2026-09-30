import { z } from "zod";

type EnvSource = Record<string, string | undefined>;

export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  REFRESH_TOKEN_SECRET: z.string().min(1, "REFRESH_TOKEN_SECRET is required"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  GOOGLE_ALLOWED_CLIENT_IDS: z.string().optional(),
  TRUSTED_CLIENT_IP_HEADER: z.enum(["none", "cf-connecting-ip", "x-forwarded-for", "x-real-ip"]).default("none"),
  REVENUECAT_FULFILLMENT_MODE: z.enum(["sandbox", "production"]).default("production"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().or(z.literal("")),
  GOOGLE_OAUTH2_URL: z.string().url().optional().or(z.literal("")),
  REVENUECAT_SECRET_API_KEY: z.string().optional(),
  REVENUECAT_WEBHOOK_SECRET: z.string().optional(),
  REVENUECAT_CREDITS_PRODUCT_ID: z.string().optional(),
  REVENUECAT_CREDITS_PER_PURCHASE: z.string().optional(),
});

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_REVENUECAT_WEB_API_KEY: z.string().optional(),
  NEXT_PUBLIC_REVENUECAT_CREDITS_PRODUCT_ID: z.string().optional(),
});

function formatEnvError(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}

export function getServerEnv(source: EnvSource = process.env) {
  const parsed = serverEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid server environment: ${formatEnvError(parsed.error)}`);
  }
  return parsed.data;
}

const productionRequiredServerKeys = [
  "REVENUECAT_SECRET_API_KEY",
  "REVENUECAT_WEBHOOK_SECRET",
  "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
  "NEXT_PUBLIC_REVENUECAT_WEB_API_KEY",
] as const;

export function validateProductionServerEnv(source: EnvSource = process.env) {
  const env = getServerEnv(source);
  if (source.NODE_ENV !== "production") {
    return env;
  }

  const missing = productionRequiredServerKeys.filter((key) => !source[key]);
  if (missing.length > 0) {
    throw new Error(
      `Invalid production server environment: ${missing
        .map((key) => `${key} is required`)
        .join("; ")}`,
    );
  }

  const issues: string[] = [];
  let database: URL | undefined;
  try { database = new URL(env.DATABASE_URL); } catch { /* collected below */ }
  if (!database || !["postgres:", "postgresql:"].includes(database.protocol) || !database.hostname || database.pathname.length < 2) {
    issues.push("DATABASE_URL must identify a PostgreSQL host and database");
  }
  const secretKeys = ["JWT_SECRET", "REFRESH_TOKEN_SECRET", "REVENUECAT_WEBHOOK_SECRET"] as const;
  const secrets = secretKeys.map(key => source[key] || "");
  for (const [index, secret] of secrets.entries()) {
    if (new TextEncoder().encode(secret).length < 32 || secret.trim() !== secret || /replace[-_ ]?with|your[-_ ]|change[-_ ]?me|example|placeholder/i.test(secret) || new Set(secret).size < 8) {
      issues.push(`${secretKeys[index]} must be an independent random secret of at least 32 bytes, without placeholders`);
    }
  }
  if (new Set(secrets).size !== secrets.length) issues.push("JWT, refresh and webhook secrets must be different");
  for (const key of ["OPENAI_API_KEY", "REVENUECAT_SECRET_API_KEY", "NEXT_PUBLIC_REVENUECAT_WEB_API_KEY", "NEXT_PUBLIC_GOOGLE_CLIENT_ID"] as const) {
    const value = source[key] || "";
    if (value.trim() !== value || value.length < 8 || /your[-_ ]|replace[-_ ]?with|placeholder/i.test(value)) issues.push(`${key} must be a non-placeholder provider credential`);
  }
  if (source.GOOGLE_ALLOWED_CLIENT_IDS?.trim() && !source.GOOGLE_ALLOWED_CLIENT_IDS.split(",").every(id => id.trim().endsWith(".apps.googleusercontent.com"))) issues.push("GOOGLE_ALLOWED_CLIENT_IDS must contain OAuth client IDs");
  if (source.REVENUECAT_CREDITS_PER_PURCHASE !== undefined && !/^[1-9]\d{0,4}$/.test(source.REVENUECAT_CREDITS_PER_PURCHASE)) issues.push("REVENUECAT_CREDITS_PER_PURCHASE must be a positive integer up to 99999");
  if (issues.length) throw new Error(`Invalid production server environment: ${issues.join("; ")}`);
  return env;
}

export function getPublicEnv(source: EnvSource = {
  // Next.js only inlines statically referenced NEXT_PUBLIC_ variables.
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  NEXT_PUBLIC_REVENUECAT_WEB_API_KEY: process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY,
  NEXT_PUBLIC_REVENUECAT_CREDITS_PRODUCT_ID: process.env.NEXT_PUBLIC_REVENUECAT_CREDITS_PRODUCT_ID,
}) {
  const parsed = publicEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid public environment: ${formatEnvError(parsed.error)}`);
  }
  return parsed.data;
}

export function getRequiredServerEnv(
  key: keyof z.infer<typeof serverEnvSchema>,
  source: EnvSource = process.env,
) {
  const value = source[key];
  if (!value) {
    throw new Error(`Invalid server environment: ${key} is required`);
  }
  return value;
}
