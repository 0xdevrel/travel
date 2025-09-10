// Simple in-memory reference store for payment references.
// NOTE: In production, replace with a durable database keyed to the user/session.

interface PaymentReference {
  reference: string;
  timestamp: number;
  used: boolean;
}

export const paymentReferences = new Map<string, PaymentReference>();


// Clean up expired references (older than 10 minutes)
export function cleanupExpiredReferences() {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes
  
  for (const [reference, data] of paymentReferences.entries()) {
    if (now - data.timestamp > maxAge) {
      paymentReferences.delete(reference);
      console.log(`Cleaned up expired payment reference: ${reference}`);
    }
  }
}

// Add a new payment reference
export function addPaymentReference(reference: string) {
  paymentReferences.set(reference, {
    reference,
    timestamp: Date.now(),
    used: false
  });
  console.log(`Added payment reference: ${reference}`);
}

// Check if payment reference exists and is valid
export function hasPaymentReference(reference: string): boolean {
  const data = paymentReferences.get(reference);
  if (!data) return false;
  
  // Check if expired (10 minutes)
  const now = Date.now();
  const maxAge = 10 * 60 * 1000;
  if (now - data.timestamp > maxAge) {
    paymentReferences.delete(reference);
    console.log(`Payment reference expired: ${reference}`);
    return false;
  }
  
  return !data.used;
}

// Mark payment reference as used
export function markPaymentReferenceUsed(reference: string) {
  const data = paymentReferences.get(reference);
  if (data) {
    data.used = true;
    console.log(`Marked payment reference as used: ${reference}`);
  }
}

