import { NextResponse } from "next/server";
import { adminCookie, safeOrigin } from "@/lib/security";

export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const response = NextResponse.redirect(new URL("/admin/login", request.url), 303);
  response.cookies.set(adminCookie.name, "", { ...adminCookie.options, maxAge: 0 });
  return response;
}
