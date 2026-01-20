import { cn } from "@/lib/utils";
import { Check, Clock, Eye, AlertCircle, FileEdit } from "lucide-react";

export type DocumentStatus = "draft" | "sent" | "viewed" | "signed" | "expired";

interface StatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

const statusConfig: Record<
  DocumentStatus,
  { label: string; icon: typeof Check; className: string }
> = {
  draft: {
    label: "Borrador",
    icon: FileEdit,
    className: "bg-muted text-muted-foreground",
  },
  sent: {
    label: "Enviado",
    icon: Clock,
    className: "bg-primary/10 text-primary",
  },
  viewed: {
    label: "Visto",
    icon: Eye,
    className: "bg-warning/10 text-warning",
  },
  signed: {
    label: "Firmado",
    icon: Check,
    className: "bg-success/10 text-success",
  },
  expired: {
    label: "Expirado",
    icon: AlertCircle,
    className: "bg-destructive/10 text-destructive",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
