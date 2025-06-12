import { Badge } from "@/components/ui/badge";
import { getStatusColor, formatStatus } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant="secondary" className={getStatusColor(status)}>
      {formatStatus(status)}
    </Badge>
  );
}
