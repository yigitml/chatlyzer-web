const SENSITIVE_KEYS = new Set([
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "password",
  "secret",
]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        SENSITIVE_KEYS.has(key) ? "[REDACTED]" : redact(nested),
      ]),
    );
  }

  return value;
}

function log(method: "info" | "warn" | "error", message: string, context?: unknown) {
  if (context === undefined) {
    console[method](message);
    return;
  }

  console[method](message, redact(context));
}

export const logger = {
  info: (message: string, context?: unknown) => log("info", message, context),
  warn: (message: string, context?: unknown) => log("warn", message, context),
  error: (message: string, context?: unknown) => log("error", message, context),
};
