import { NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { players, tapBatches } from "@/lib/schema";

const payloadSchema = z.object({
  publicId: z.string().uuid(),
  tapCount: z.number().int().min(1).max(50),
  tapZone: z.number().int().min(20).max(100),
  durationMs: z.number().int().min(500).max(60000),
});

function rewardMultiplier(zone: number) {
  if (zone <= 30) return 4;
  if (zone <= 50) return 2.5;
  if (zone <= 70) return 1.5;
  return 1;
}

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const [player] = await db.select().from(players).where(eq(players.publicId, payload.publicId)).limit(1);
    if (!player) return NextResponse.json({ error: "Player not found." }, { status: 404 });

    // Basic server-side anti-cheat: reject impossible sustained tap speeds.
    const tapsPerSecond = payload.tapCount / (payload.durationMs / 1000);
    if (tapsPerSecond > 16) return NextResponse.json({ error: "Tap batch rejected." }, { status: 429 });

    const since = new Date(Date.now() - 60_000);
    const recent = await db.select({ total: sql<number>`coalesce(sum(${tapBatches.tapCount}), 0)` })
      .from(tapBatches)
      .where(and(eq(tapBatches.playerId, player.id), gte(tapBatches.createdAt, since)));
    if (Number(recent[0]?.total || 0) + payload.tapCount > 650) {
      return NextResponse.json({ error: "Slow down for a moment." }, { status: 429 });
    }

    const reward = Math.floor(payload.tapCount * player.tapPower * rewardMultiplier(payload.tapZone));
    await db.transaction(async (tx) => {
      await tx.insert(tapBatches).values({ playerId: player.id, tapCount: payload.tapCount, reward, durationMs: payload.durationMs });
      await tx.update(players).set({
        cash: sql`${players.cash} + ${reward}`,
        lifetimeTaps: sql`${players.lifetimeTaps} + ${payload.tapCount}`,
        tapZone: payload.tapZone,
        updatedAt: new Date(),
      }).where(eq(players.id, player.id));
    });

    return NextResponse.json({ accepted: true, reward });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid tap data." }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "Tap could not be recorded." }, { status: 500 });
  }
}
