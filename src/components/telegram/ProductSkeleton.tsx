import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const ProductSkeleton = () => {
  return (
    <Card className="overflow-hidden border-0 bg-card">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex justify-between items-center pt-1">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </Card>
  );
};

export const ProductGridSkeleton = ({ count = 6 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
};
