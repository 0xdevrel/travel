import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  MiniAppWalletAuthSuccessPayload,
  verifySiweMessage,
} from "@worldcoin/minikit-js";

interface IRequestPayload {
  payload: MiniAppWalletAuthSuccessPayload;
  nonce: string;
}

export const POST = async (req: NextRequest) => {
  try {
    const { payload, nonce } = (await req.json()) as IRequestPayload;
    
    // Verify nonce matches the one we created earlier
    const cookieStore = await cookies();
    const storedNonce = cookieStore.get("siwe")?.value;
    if (nonce !== storedNonce) {
      return NextResponse.json({
        status: "error",
        isValid: false,
        message: "Invalid nonce",
      });
    }

    // Verify the SIWE message
    const validMessage = await verifySiweMessage(payload, nonce);
    
    if (validMessage.isValid) {
      // Clear the nonce after successful verification
      cookieStore.delete("siwe");
      
      return NextResponse.json({
        status: "success",
        isValid: true,
        user: {
          walletAddress: payload.address,
          username: null, // Will be fetched separately if needed
        },
      });
    } else {
      return NextResponse.json({
        status: "error",
        isValid: false,
        message: "Invalid signature",
      });
    }
  } catch (error: unknown) {
    // Handle errors in validation or processing
    return NextResponse.json({
      status: "error",
      isValid: false,
      message: error instanceof Error ? error.message : "Verification failed",
    });
  }
};
