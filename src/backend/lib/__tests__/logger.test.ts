import { afterEach, expect, it, vi } from "vitest";
import { logger } from "../logger";
afterEach(() => vi.restoreAllMocks());
it("redacts nested, case-insensitive credentials and conversation fields", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  logger.error("Safe classification", { Authorization: "Bearer private", ID_TOKEN: "credential", nested: { content: "Private conversation", email: "private@example.invalid", requestId: "safe-id" } });
  expect(spy).toHaveBeenCalledWith("Safe classification", { Authorization: "[REDACTED]", ID_TOKEN: "[REDACTED]", nested: { content: "[REDACTED]", email: "[REDACTED]", requestId: "safe-id" } });
});
it("does not log provider/database exception messages or stacks", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  const exception = Object.assign(new Error("Private prompt + database values"), { code: "P2025" });
  logger.error("Request failed", exception);
  expect(spy).toHaveBeenCalledWith("Request failed", { name: "Error", code: "P2025" });
});
