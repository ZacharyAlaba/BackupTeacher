import { NextResponse } from "next/server";
import { getRuntimeEnvStatus } from "@/lib/runtime-env";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const envStatus = getRuntimeEnvStatus();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      database: "connected",
      env: envStatus,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: "unavailable",
        error: error instanceof Error ? error.message : "Unknown database error",
        env: envStatus,
      },
      { status: 503 }
    );
  }
}
