import { NextRequest } from "next/server";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { logger } from "./logger";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

/** Bound actual bytes, including chunked bodies, before JSON decoding. */
export async function readJson(request: NextRequest, maxBytes = 16 * 1024 * 1024): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new ApiError("Content-Type must be application/json", 415);
  }
  if (Number(request.headers.get("content-length")) > maxBytes) throw new ApiError("Request body too large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("Invalid JSON body", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new ApiError("Request body too large", 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { throw new ApiError("Invalid JSON body", 400); }
  } finally { reader.releaseLock(); }
}

export function apiErrorResponse(error: unknown, fallback = "Internal server error") {
  if (error instanceof ApiError) return ApiResponse.error(error.message, error.status).toResponse();
  if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
    return ApiResponse.error("Resource not found", 404).toResponse();
  }
  logger.error(fallback, error);
  return ApiResponse.error(fallback, 500).toResponse();
}
