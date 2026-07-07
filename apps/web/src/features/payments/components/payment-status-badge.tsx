import type { PaymentStatusType } from "@drivehub/contracts";
import { Badge } from "@/components/ui/badge";

const variantByStatus: Record<PaymentStatusType, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  SUCCEEDED: "default",
  FAILED: "destructive",
  REFUNDED: "secondary",
  PARTIALLY_REFUNDED: "secondary",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatusType }) {
  return <Badge variant={variantByStatus[status]}>{status.replace(/_/g, " ")}</Badge>;
}
