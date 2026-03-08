import { Skeleton } from "@/components/ui/skeleton";

export const ProductSkeleton = () => (
  <div>
    <Skeleton className="aspect-square w-full rounded-2xl" />
    <div className="mt-3 space-y-2 px-0.5">
      <Skeleton className="h-3.5 w-full rounded-lg" />
      <Skeleton className="h-3.5 w-2/3 rounded-lg" />
      <div className="flex justify-between items-center pt-0.5">
        <Skeleton className="h-4 w-16 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  </div>
);

export const ProductGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-2 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <ProductSkeleton key={i} />
    ))}
  </div>
);
