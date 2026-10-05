import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "lagos_admin_session";

function sessionKey() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(secret);
}

export async function createAdminToken(admin: { id: number; email: string; role: string }) {
  return new SignJWT({ email: admin.email, role: admin.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(admin.id))
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(sessionKey());
}

export async function verifyAdminToken(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey());
    return { id: Number(payload.sub), email: String(payload.email), role: String(payload.role) };
  } catch {
    return null;
  }
}

export const adminCookie = {
  name: SESSION_COOKIE,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 60 * 60 * 8,
  },
};

export function hashIp(ip: string) {
  const pepper = process.env.AUDIT_PEPPER || process.env.ADMIN_SESSION_SECRET || "";
  return crypto.createHash("sha256").update(`${pepper}:${ip}`).digest("hex");
}

function encryptionKey() {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) throw new Error("SETTINGS_ENCRYPTION_KEY is not configured");
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(value: string) {
  const [ivRaw, tagRaw, dataRaw] = value.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataRaw, "base64")), decipher.final()]).toString("utf8");
}

export function safeOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
