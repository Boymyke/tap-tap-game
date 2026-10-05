import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminUsers, auditLogs } from "@/lib/schema";
import { adminCookie, createAdminToken, hashIp, safeOrigin } from "@/lib/security";

const schema = z.object({ email: z.string().email().max(190), password: z.string().min(12).max(200) });

function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function allowedIp(ip: string) {
  const list = (process.env.ADMIN_IP_ALLOWLIST || "").split(",").map(v => v.trim()).filter(Boolean);
  return list.length === 0 || list.includes(ip);
}

export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const ip = clientIp(request);
  if (!allowedIp(ip)) return NextResponse.json({ error: "Admin access is not allowed from this network." }, { status: 403 });

  try {
    const body = schema.parse(await request.json());
    const email = body.email.toLowerCase();
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    const now = new Date();

    if (!admin || !admin.isActive) {
      await db.insert(auditLogs).values({ action: "admin_login_unknown", ipHash: hashIp(ip), metadata: { email } });
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }
    if (admin.lockedUntil && admin.lockedUntil > now) {
      return NextResponse.json({ error: "Account temporarily locked. Try again later." }, { status: 423 });
    }

    const ok = await bcrypt.compare(body.password, admin.passwordHash);
    if (!ok) {
      const attempts = admin.failedAttempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;
      await db.update(adminUsers).set({ failedAttempts: attempts >= 5 ? 0 : attempts, lockedUntil }).where(eq(adminUsers.id, admin.id));
      await db.insert(auditLogs).values({ adminId: admin.id, action: "admin_login_failed", ipHash: hashIp(ip), metadata: { locked: Boolean(lockedUntil) } });
      return NextResponse.json({ error: lockedUntil ? "Too many failed attempts. Account locked for 30 minutes." : "Invalid credentials." }, { status: 401 });
    }

    await db.update(adminUsers).set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: now }).where(eq(adminUsers.id, admin.id));
    await db.insert(auditLogs).values({ adminId: admin.id, action: "admin_login_success", ipHash: hashIp(ip) });
    const token = await createAdminToken(admin);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(adminCookie.name, token, adminCookie.options);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid login details." }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "Login unavailable." }, { status: 500 });
  }
}
