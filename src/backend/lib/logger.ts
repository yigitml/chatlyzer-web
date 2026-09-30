const SENSITIVE_KEYS = /token|authorization|cookie|password|secret|content|messages|participants|sender|email|payload|prompt|result|metadata|url/i;
function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value instanceof Error) {
    // Provider/database exception messages and stacks can contain prompts, URLs,
    // credentials or user values. Retain only safe diagnostic classifications.
    const code = "code" in value && typeof value.code === "string" ? value.code : undefined;
    return { name: value.name, ...(code ? { code } : {}) };
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    if (Array.isArray(value)) return value.map(item => redact(item, seen));
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, SENSITIVE_KEYS.test(key) ? "[REDACTED]" : redact(nested, seen)]));
  }
  return value;
}
function log(method: "info" | "warn" | "error", message: string, context?: unknown) {
  if (context === undefined) console[method](message);
  else console[method](message, redact(context));
}
export const logger = {
  info: (message: string, context?: unknown) => log("info", message, context),
  warn: (message: string, context?: unknown) => log("warn", message, context),
  error: (message: string, context?: unknown) => log("error", message, context),
};
