import { z } from "zod";

type EnvSource = Record<string, string | undefined>;

const optionalUrl = z.string().url().optional().or(z.literal(""));

export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  REFRESH_TOKEN_SECRET: z.string().min(1, "REFRESH_TOKEN_SECRET is required"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  GOOGLE_OAUTH2_URL: optionalUrl,
  POLAR_ACCESS_TOKEN: z.string().optional(),
  POLAR_PRODUCT_ID: z.string().optional(),
  POLAR_WEBHOOK_SECRET: z.string().optional(),
  POLAR_ORGANIZATION_ID: z.string().optional(),
  POLAR_PROJ_ID: z.string().optional(),
  WEBHOOK_DELIVERY_URL: optionalUrl,
  POLAR_SANDBOX_ACCESS_TOKEN: z.string().optional(),
  POLAR_SANDBOX_PRODUCT_ID: z.string().optional(),
  POLAR_SANDBOX_WEBHOOK_SECRET: z.string().optional(),
  POLAR_SANDBOX_PROJ_ID: z.string().optional(),
  POLAR_SANDBOX_WEBHOOK_DELIVERY_URL: optionalUrl,
  REVENUECAT_SECRET_API_KEY: z.string().optional(),
  REVENUECAT_WEBHOOK_SECRET: z.string().optional(),
  REVENUECAT_CREDITS_PRODUCT_ID: z.string().optional(),
  REVENUECAT_CREDITS_PER_PURCHASE: z.string().optional(),
});

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional().or(z.literal("")),
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
  "POLAR_ACCESS_TOKEN",
  "POLAR_PRODUCT_ID",
  "POLAR_WEBHOOK_SECRET",
  "POLAR_PROJ_ID",
  "WEBHOOK_DELIVERY_URL",
  "REVENUECAT_SECRET_API_KEY",
  "REVENUECAT_WEBHOOK_SECRET",
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

  return env;
}

export function getPublicEnv(source: EnvSource = process.env) {
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
