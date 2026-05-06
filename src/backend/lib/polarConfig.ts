import { rawPrisma } from "@/backend/lib/prisma";

export type PolarMode = "sandbox" | "production";

export type PolarConfig = {
  mode: PolarMode;
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

  return {
    mode,
    accessToken: isSandbox
      ? requiredEnv("POLAR_SANDBOX_ACCESS_TOKEN")
      : requiredEnv("POLAR_ACCESS_TOKEN"),
    apiBaseUrl: isSandbox
      ? "https://sandbox-api.polar.sh/v1"
      : "https://api.polar.sh/v1",
    webhookSecret: isSandbox
      ? requiredEnv("POLAR_SANDBOX_WEBHOOK_SECRET")
      : requiredEnv("POLAR_WEBHOOK_SECRET"),
    projectId: isSandbox
      ? requiredEnv("POLAR_SANDBOX_PROJ_ID")
      : requiredEnv("POLAR_PROJ_ID"),
    productId: isSandbox
      ? requiredEnv("POLAR_SANDBOX_PRODUCT_ID")
      : requiredEnv("POLAR_PRODUCT_ID"),
    webhookDeliveryUrl: isSandbox
      ? requiredEnv("POLAR_SANDBOX_WEBHOOK_DELIVERY_URL")
      : requiredEnv("WEBHOOK_DELIVERY_URL"),
  };
}

export async function getPolarConfig(): Promise<PolarConfig> {
  const mode = await getPolarMode();
  return getPolarConfigForMode(mode);
}
