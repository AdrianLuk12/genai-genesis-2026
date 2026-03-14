import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidCredential } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (isValidCredential("user", email, password)) {
    const cookieStore = await cookies();
    cookieStore.set("user_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { success: false, error: "Invalid email or password" },
    { status: 401 },
  );
}
