import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { adminUsers } from "../lib/schema";

async function main() {
  const email = (process.env.INITIAL_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD || "";
  if (!email) throw new Error("INITIAL_ADMIN_EMAIL is required");
  if (password.length < 14) throw new Error("INITIAL_ADMIN_PASSWORD must be at least 14 characters");

  const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  if (existing) {
    console.log("Admin already exists. No changes made.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.insert(adminUsers).values({ email, passwordHash, role: "super_admin" });
  console.log(`Created super admin: ${email}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
