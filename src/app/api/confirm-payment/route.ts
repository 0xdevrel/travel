import { NextRequest, NextResponse } from "next/server";
import { MiniAppPaymentSuccessPayload, tokenToDecimals, Tokens } from "@worldcoin/minikit-js";
import { hasPaymentReference, cleanupExpiredReferences } from "../_paymentStore";

interface IRequestPayload {
  payload: MiniAppPaymentSuccessPayload;
}

export async function POST(req: NextRequest) {
  try {
    const { payload } = (await req.json()) as IRequestPayload;

    // Clean up expired references first
    cleanupExpiredReferences();

    // Check we initiated this reference
    // Accept either: (a) in-memory match; or (b) HttpOnly cookie fallback set during initiation
    const cookieFallback = req.cookies.get("pay_ref")?.value;
    const hasReferenceInMemory = !!payload?.reference && hasPaymentReference(payload.reference);
    const referenceMatchesCookie = !!payload?.reference && cookieFallback === payload.reference;
    if (!payload?.reference || (!hasReferenceInMemory && !referenceMatchesCookie)) {
      return NextResponse.json({ success: false, error: "Unknown or expired reference" }, { status: 400 });
    }

    // Expected payment details — 0.5 WLD for image generation
    const EXPECTED_RECIPIENT = process.env.NEXT_PUBLIC_PAYMENT_RECIPIENT_ADDRESS?.toLowerCase();
    if (!EXPECTED_RECIPIENT) {
      console.error("Missing NEXT_PUBLIC_PAYMENT_RECIPIENT_ADDRESS environment variable");
      return NextResponse.json({ success: false, error: "Server configuration error" }, { status: 500 });
    }

    const ACCEPTED = [
      { symbol: "WLD", amount: tokenToDecimals(0.5, Tokens.WLD).toString() },
    ] as const;

    // Verify payment via Developer Portal API
    const appId = process.env.NEXT_PUBLIC_WLD_APP_ID;
    const apiKey = process.env.DEV_PORTAL_API_KEY;
    if (!appId || !apiKey) {
      console.error("Missing environment variables:", { appId: !!appId, apiKey: !!apiKey });
      return NextResponse.json({ success: false, error: "Missing APP_ID or DEV_PORTAL_API_KEY" }, { status: 500 });
    }

    const url = `https://developer.worldcoin.org/api/v2/minikit/transaction/${payload.transaction_id}?app_id=${appId}`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      // Avoid Next.js caching
      cache: "no-store",
    });
    if (!resp.ok) {
      console.error("Developer Portal API failed:", resp.status, await resp.text().catch(() => ""));
      return NextResponse.json({ success: false, error: `Portal query failed: ${resp.status}` }, { status: 502 });
    }
    const tx = await resp.json();

    // Confirm reference echoes and not failed. You can wait until status == 'mined'.
    const referenceOk = tx?.reference === payload.reference;
    // Treat missing status as acceptable for optimistic confirmation; only fail on explicit 'failed'
    const statusOk = tx?.status !== "failed";

    // Try to validate amount/token/recipient if present in the portal response
    const lowerRecipient = (tx?.recipient || tx?.to)?.toLowerCase?.();
    const tokensArray = Array.isArray(tx?.tokens) ? tx.tokens : undefined;
    const primaryToken = tokensArray && tokensArray.length > 0 ? tokensArray[0] : undefined;
    const amountCandidates = [
      tx?.amount,
      tx?.token_amount,
      primaryToken?.token_amount,
    ].filter(Boolean);
    const tokenSymbolCandidates = [
      tx?.token,
      tx?.symbol,
      primaryToken?.symbol,
    ].filter(Boolean);

    const recipientOk = lowerRecipient ? lowerRecipient === EXPECTED_RECIPIENT : true;
    let tokenOk = true;
    let amountOk = true;
    if (tokenSymbolCandidates.length > 0 && amountCandidates.length > 0) {
      tokenOk = false;
      amountOk = false;
      for (const opt of ACCEPTED) {
        if (tokenSymbolCandidates.includes(opt.symbol) && amountCandidates.includes(opt.amount)) {
          tokenOk = true;
          amountOk = true;
          break;
        }
      }
    }

    console.log("Payment validation:", {
      referenceOk,
      statusOk,
      recipientOk,
      tokenOk,
      amountOk,
      txStatus: tx?.status,
      txReference: tx?.reference,
      expectedReference: payload.reference
    });

    if (referenceOk && statusOk && recipientOk && tokenOk && amountOk) {
      // Don't delete reference here - let generate-image API handle it
      console.log("Payment confirmed successfully");
      const res = NextResponse.json({ success: true });
      try {
        // Clear cookie on success
        res.cookies.set("pay_ref", "", { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 0 });
      } catch {}
      return res;
    }

    const failureReason = [
      !referenceOk && "reference_mismatch",
      !statusOk && "invalid_status",
      !recipientOk && "recipient_mismatch", 
      !tokenOk && "token_mismatch",
      !amountOk && "amount_mismatch"
    ].filter(Boolean).join(", ");
    
    console.error("Payment validation failed:", failureReason);
    return NextResponse.json({ success: false, error: `Validation failed: ${failureReason}` }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
