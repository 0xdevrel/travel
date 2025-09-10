import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  // Expects only alphanumeric characters
  const nonce = crypto.randomUUID().replace(/-/g, "");

  // The nonce should be stored somewhere that is not tamperable by the client
  // Optionally you can HMAC the nonce with a secret key stored in your environment
  const cookieStore = await cookies();
  cookieStore.set("siwe", nonce, { secure: true, httpOnly: true, sameSite: "strict" });
  
  return NextResponse.json({ nonce });
}
