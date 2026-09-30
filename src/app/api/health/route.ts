import { NextResponse } from "next/server";
import prisma from "@/backend/lib/prisma";
import { validateProductionServerEnv } from "@/shared/config/env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    validateProductionServerEnv();
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        checks: {
          database: "ok",
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        status: "error",
        checks: {
          database: "error",
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
