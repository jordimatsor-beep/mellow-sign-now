import { Skeleton } from "@/components/ui/skeleton";

export function DocumentsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
