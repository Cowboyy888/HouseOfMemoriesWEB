import type { BookingStatusType } from "@drivehub/contracts";
import { Badge } from "@/components/ui/badge";

const variantByStatus: Record<BookingStatusType, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  CONFIRMED: "default",
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

export function BookingStatusBadge({ status }: { status: BookingStatusType }) {
  return <Badge variant={variantByStatus[status]}>{status.replace(/_/g, " ")}</Badge>;
}
