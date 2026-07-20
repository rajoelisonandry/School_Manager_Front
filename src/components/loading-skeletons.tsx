import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const STAT_GRID_CLASSES: Record<number, string> = {
  2: "grid gap-6 md:grid-cols-2",
  3: "grid gap-6 md:grid-cols-2 lg:grid-cols-3",
  4: "grid gap-6 md:grid-cols-2 lg:grid-cols-4",
};

// Largeurs variées pour un rendu plus naturel qu'une grille rigide
const ROW_WIDTHS = [90, 70, 85, 60, 95, 75, 80, 65];

export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
  );
}

export function StatCardsSkeleton({ count = 3 }: { count?: 2 | 3 | 4 }) {
  return (
    <div className={STAT_GRID_CLASSES[count]}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  cols = 5,
  headerControls = 1,
}: {
  rows?: number;
  cols?: number;
  headerControls?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Skeleton className="h-6 w-48" />
          {headerControls > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {Array.from({ length: headerControls }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-32 sm:w-40" />
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4 border-b border-border pb-3">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className="h-3.5 flex-1"
                style={{ maxWidth: `${ROW_WIDTHS[c % ROW_WIDTHS.length]}px` }}
              />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex items-center gap-4">
              {Array.from({ length: cols }).map((_, c) => (
                <Skeleton
                  key={c}
                  className="h-4 flex-1"
                  style={{
                    maxWidth: `${ROW_WIDTHS[(c + r) % ROW_WIDTHS.length]}px`,
                    animationDelay: `${(r * cols + c) * 20}ms`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PageListSkeleton({
  withStats = false,
  statCount = 3,
  filters = 0,
  tableCols = 6,
  tableRows = 6,
  tableHeaderControls = 1,
  withHeaderActionButton = true,
}: {
  withStats?: boolean;
  statCount?: 2 | 3 | 4;
  filters?: number;
  tableCols?: number;
  tableRows?: number;
  tableHeaderControls?: number;
  withHeaderActionButton?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageHeaderSkeleton />
        {withHeaderActionButton && <Skeleton className="h-10 w-40" />}
      </div>

      {filters > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {Array.from({ length: filters }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-44" />
          ))}
        </div>
      )}

      {withStats && <StatCardsSkeleton count={statCount} />}

      <TableSkeleton rows={tableRows} cols={tableCols} headerControls={tableHeaderControls} />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />

      <StatCardsSkeleton count={3} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-2 w-32 rounded-full" />
                  <Skeleton className="h-4 w-6" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <div className="space-y-1.5 text-right">
                  <Skeleton className="ml-auto h-4 w-20" />
                  <Skeleton className="ml-auto h-3 w-16" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-56 w-full" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
        </CardContent>
      </Card>
    </div>
  );
}
