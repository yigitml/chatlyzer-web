import { NextResponse } from "next/server";
import { AuthenticatedRequest, MiddlewareHandler } from "./combinedMiddleware";

export function requestContext(): MiddlewareHandler {
  return (req: AuthenticatedRequest): NextResponse => {
    const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-request-id", requestId);
    req.requestId = requestId;

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  };
}
