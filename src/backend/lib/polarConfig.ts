import { rawPrisma } from "@/backend/lib/prisma";

export type PolarMode = "sandbox" | "production";

export type PolarConfig = {
  mode: PolarMode;
  variant: "local-sandbox" | "sandbox" | "production";
  accessToken: string;
  apiBaseUrl: string;
  webhookSecret: string;
  projectId: string;
  productId: string;
  webhookDeliveryUrl: string;
};

const POLAR_MODE_SETTING_KEY = "polarMode";

export function isPolarMode(value: unknown): value is PolarMode {
  return value === "sandbox" || value === "production";
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value || undefined;
}

export async function getPolarMode(): Promise<PolarMode> {
  const setting = await (rawPrisma as any).appSetting.findUnique({
    where: { key: POLAR_MODE_SETTING_KEY },
  });

  if (isPolarMode(setting?.value)) {
    return setting.value;
  }

  return "production";
}

export async function setPolarMode(mode: PolarMode): Promise<PolarMode> {
  await (rawPrisma as any).appSetting.upsert({
    where: { key: POLAR_MODE_SETTING_KEY },
    create: { key: POLAR_MODE_SETTING_KEY, value: mode },
    update: { value: mode },
  });

  return mode;
}

export function getPolarConfigForMode(mode: PolarMode): PolarConfig {
  const isSandbox = mode === "sandbox";
  const isLocalSandbox = isSandbox && process.env.NODE_ENV !== "production";

  if (!isSandbox) {
    return {
      mode,
      variant: "production",
      accessToken: requiredEnv("POLAR_ACCESS_TOKEN"),
      apiBaseUrl: "https://api.polar.sh/v1",
      webhookSecret: requiredEnv("POLAR_WEBHOOK_SECRET"),
      projectId: requiredEnv("POLAR_PROJ_ID"),
      productId: requiredEnv("POLAR_PRODUCT_ID"),
      webhookDeliveryUrl: requiredEnv("WEBHOOK_DELIVERY_URL"),
    };
  }

  return {
    mode,
    variant: isLocalSandbox ? "local-sandbox" : "sandbox",
    accessToken: requiredEnv("POLAR_SANDBOX_ACCESS_TOKEN"),
    apiBaseUrl: "https://sandbox-api.polar.sh/v1",
    webhookSecret: requiredEnv("POLAR_SANDBOX_WEBHOOK_SECRET"),
    projectId: requiredEnv("POLAR_SANDBOX_PROJ_ID"),
    productId: isLocalSandbox
      ? (optionalEnv("POLAR_LOCAL_SANDBOX_PRODUCT_ID") ??
        requiredEnv("POLAR_SANDBOX_PRODUCT_ID"))
      : requiredEnv("POLAR_SANDBOX_PRODUCT_ID"),
    webhookDeliveryUrl: isLocalSandbox
      ? (optionalEnv("POLAR_LOCAL_SANDBOX_WEBHOOK_DELIVERY_URL") ??
        requiredEnv("POLAR_SANDBOX_WEBHOOK_DELIVERY_URL"))
      : requiredEnv("POLAR_SANDBOX_WEBHOOK_DELIVERY_URL"),
  };
}

export async function getPolarConfig(): Promise<PolarConfig> {
  const mode = await getPolarMode();
  return getPolarConfigForMode(mode);
}
