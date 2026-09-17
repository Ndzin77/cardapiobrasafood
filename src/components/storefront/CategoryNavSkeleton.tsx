import { Skeleton } from "@/components/ui/skeleton";

export function CategoryNavSkeleton() {
  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container py-3">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="h-10 rounded-full shrink-0"
              style={{ width: `${80 + Math.random() * 40}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
