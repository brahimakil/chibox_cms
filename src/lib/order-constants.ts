/* ── Order system constants ──────────────────────────────────────────── */

export const ORDER_STATUS: Record<number, { label: string; color: string }> = {
  9: { label: "Pending", color: "yellow" },
  1: { label: "Confirmed", color: "blue" },
  2: { label: "Processing", color: "indigo" },
  10: { label: "Processed", color: "cyan" },
  3: { label: "Shipping", color: "purple" },
  4: { label: "Delivered", color: "green" },
  5: { label: "Cancelled", color: "red" },
  6: { label: "Refunded", color: "orange" },
  7: { label: "Failed", color: "red" },
  8: { label: "On Hold", color: "gray" },
};

export const SHIPPING_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: "Pending Review", color: "yellow" },
  1: { label: "Ready to Pay", color: "blue" },
  2: { label: "Paid", color: "green" },
};

export const PAYMENT_TYPES: Record<number, string> = {
  1: "Cash on Delivery",
  2: "Credit/Debit Card",
  3: "PayPal",
  4: "Stripe",
  5: "Online Payment",
  6: "Whish Money",
};

/** Status transitions that are considered valid.
 * The backend (OrderController.php actionUpdateStatus) is more permissive
 * and accepts any status 1-9. We keep some guardrails but allow admin flexibility.
 */
export const VALID_STATUS_TRANSITIONS: Record<number, number[]> = {
  9: [1, 2, 5, 8],        // Pending → Confirmed, Processing, Cancelled, On Hold
  1: [2, 10, 3, 5, 8],    // Confirmed → Processing, Processed, Shipping, Cancelled, On Hold
  2: [10, 3, 5, 8],       // Processing → Processed, Shipping, Cancelled, On Hold
  10: [3, 5, 8],           // Processed → Shipping, Cancelled, On Hold
  3: [4, 5],               // Shipping → Delivered, Cancelled
  4: [6],                  // Delivered → Refunded
  5: [9],                  // Cancelled → Pending (reinstate)
  6: [],                   // Refunded → nothing
  7: [9],                  // Failed → Pending (retry)
  8: [1, 2, 5, 9],        // On Hold → Confirmed, Processing, Cancelled, Pending
};
