import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { players, storyEvents } from "@/lib/schema";

const bodySchema = z.object({ nickname: z.string().trim().min(2).max(24) });

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const publicId = crypto.randomUUID();
    const lifeSeed = crypto.randomBytes(12).toString("hex");
    const [player] = await db.insert(players).values({ publicId, nickname: body.nickname, lifeSeed }).returning();
    await db.insert(storyEvents).values({
      playerId: player.id,
      eventKey: "day-1-kicked-out",
      title: "You got kicked out",
      body: "Your host says you need to leave tonight. You have ₦1,500 and a damaged phone.",
    });
    return NextResponse.json({ publicId: player.publicId, cash: player.cash });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Choose a nickname between 2 and 24 characters." }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "Could not create your life." }, { status: 500 });
  }
}
