import { NextResponse } from "next/server";
import { paymentReferences } from "../_paymentStore";

export async function POST() {
  const uuid = crypto.randomUUID().replace(/-/g, "");

  // Store server-issued reference in-memory (best-effort) and also in an HttpOnly cookie
  // In-memory can be lost on serverless cold starts/HMR; cookie ensures continuity per user
  paymentReferences.add(uuid);

  const res = NextResponse.json({ id: uuid });
  try {
    res.cookies.set("pay_ref", uuid, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10, // 10 minutes
    });
  } catch {
    // ignore cookie errors; backend will still accept in-memory reference
  }
  return res;
}
