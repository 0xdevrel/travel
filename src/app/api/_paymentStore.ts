// Simple in-memory reference store for payment references.
// NOTE: In production, replace with a durable database keyed to the user/session.

export const paymentReferences = new Set<string>();
