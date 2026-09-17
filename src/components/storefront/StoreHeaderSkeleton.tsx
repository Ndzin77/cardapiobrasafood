import { Skeleton } from "@/components/ui/skeleton";

export function StoreHeaderSkeleton() {
  return (
    <div className="relative">
      {/* Cover Image Skeleton */}
      <Skeleton className="h-40 sm:h-48 md:h-64 w-full" />

      {/* Store Info Card Skeleton */}
      <div className="container relative -mt-16 sm:-mt-20 md:-mt-24 px-3 sm:px-4">
        <div className="bg-card rounded-2xl shadow-medium p-4 sm:p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            {/* Logo Skeleton */}
            <Skeleton className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-2xl mx-auto md:mx-0 shrink-0" />

            {/* Info Skeleton */}
            <div className="flex-1 space-y-3 text-center md:text-left pt-1">
              {/* Name and badge */}
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>

              {/* Description */}
              <div className="space-y-1.5 max-w-xl mx-auto md:mx-0">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>

              {/* Payment Methods */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-16 rounded-full" />
                ))}
              </div>
            </div>

            {/* Delivery Info - Desktop */}
            <div className="hidden md:block shrink-0">
              <Skeleton className="w-32 h-24 rounded-xl" />
            </div>
          </div>

          {/* Mobile Delivery Info */}
          <Skeleton className="md:hidden mt-4 h-16 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
