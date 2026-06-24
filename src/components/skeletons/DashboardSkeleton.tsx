import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Plan usage card */}
      <Card className="border shadow-sm bg-white">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border shadow-sm bg-white">
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-8" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent documents */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
