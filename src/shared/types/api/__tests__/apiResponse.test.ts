import { describe, expect, it } from "vitest";
import { ApiResponse } from "../apiResponse";

describe("ApiResponse", () => {
  it("serializes success responses with status and data", async () => {
    const response = ApiResponse.success({ id: "user_1" }, "ok", 201).toResponse();

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { id: "user_1" },
      message: "ok",
    });
    expect(response.status).toBe(201);
  });

  it("serializes error responses with status and error", async () => {
    const response = ApiResponse.error("bad request", 422).toResponse();

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "bad request",
    });
    expect(response.status).toBe(422);
  });
});
