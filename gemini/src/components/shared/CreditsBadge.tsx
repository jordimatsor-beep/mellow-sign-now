import { Coins } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface CreditsBadgeProps {
  count: number;
  className?: string;
}

export function CreditsBadge({ count, className }: CreditsBadgeProps) {
  const isLow = count <= 2;

  return (
    <Link
      to="/credits"
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        isLow
          ? "bg-warning/10 text-warning hover:bg-warning/20"
          : "bg-primary/10 text-primary hover:bg-primary/20",
        className
      )}
    >
      <Coins className="h-4 w-4" />
      <span>{count}</span>
    </Link>
  );
}
