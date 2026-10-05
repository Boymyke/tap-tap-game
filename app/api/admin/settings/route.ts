import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminCookie, encryptSecret, hashIp, safeOrigin, verifyAdminToken } from "@/lib/security";
import { appSettings, auditLogs } from "@/lib/schema";

const schema = z.object({
  publicKey: z.string().trim().max(200).optional().default(""),
  secretKey: z.string().trim().max(240).optional().default(""),
});

function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

async function upsertPublic(key: string, value: string, adminId: number) {
  const [existing] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  if (existing) await db.update(appSettings).set({ publicValue: value, updatedBy: adminId, updatedAt: new Date() }).where(eq(appSettings.id, existing.id));
  else await db.insert(appSettings).values({ key, publicValue: value, updatedBy: adminId });
}

async function upsertSecret(key: string, value: string, adminId: number) {
  const encryptedValue = encryptSecret(value);
  const [existing] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  if (existing) await db.update(appSettings).set({ encryptedValue, updatedBy: adminId, updatedAt: new Date() }).where(eq(appSettings.id, existing.id));
  else await db.insert(appSettings).values({ key, encryptedValue, updatedBy: adminId });
}

export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const cookieStore = await cookies();
  const session = await verifyAdminToken(cookieStore.get(adminCookie.name)?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const body = schema.parse(await request.json());
    if (body.publicKey && !/^pk_(test|live)_/.test(body.publicKey)) return NextResponse.json({ error: "That does not look like a Paystack public key." }, { status: 400 });
    if (body.secretKey && !/^sk_(test|live)_/.test(body.secretKey)) return NextResponse.json({ error: "That does not look like a Paystack secret key." }, { status: 400 });
    await upsertPublic("paystack_public_key", body.publicKey, session.id);
    if (body.secretKey) await upsertSecret("paystack_secret_key", body.secretKey, session.id);
    await db.insert(auditLogs).values({ adminId: session.id, action: "payment_settings_updated", ipHash: hashIp(clientIp(request)), metadata: { publicKeyUpdated: Boolean(body.publicKey), secretKeyUpdated: Boolean(body.secretKey) } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "Could not save settings." }, { status: 500 });
  }
}
