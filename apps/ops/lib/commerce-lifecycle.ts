export type CommerceReturnStatus =
  | "requested"
  | "approved"
  | "received"
  | "refunded"
  | "rejected"
  | "cancelled";

export const returnStatusTransitions: Readonly<Record<CommerceReturnStatus, readonly CommerceReturnStatus[]>> = {
  requested: ["requested", "approved", "rejected", "cancelled"],
  approved: ["approved", "received", "cancelled"],
  received: ["received", "refunded"],
  refunded: ["refunded"],
  rejected: ["rejected"],
  cancelled: ["cancelled"],
};

export function canTransitionCommerceReturn(
  current: CommerceReturnStatus,
  next: CommerceReturnStatus,
): boolean {
  return returnStatusTransitions[current].includes(next);
}
