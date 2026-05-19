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
  REVENUECAT_API_KEY: z.string().optional(),
  REVENUECAT_WEBHOOK_SECRET: z.string().optional(),
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
