import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-white/20", className)}
    />
  );
};

export const SkeletonCard = ({ className }: SkeletonProps) => {
  return (
    <div className={cn("p-4 space-y-3 bg-white/5 rounded-xl border border-white/10", className)}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
};

export const SkeletonAnalysisGrid = ({ className }: SkeletonProps) => {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3", className)}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="text-center p-2 sm:p-3 md:p-4 rounded-xl bg-white/5 border border-white/10">
          <Skeleton className="h-6 w-6 mx-auto mb-2" />
          <Skeleton className="h-3 w-16 mx-auto mb-1" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
      ))}
    </div>
  );
}; 