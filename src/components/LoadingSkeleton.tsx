import React from 'react';

interface LoadingSkeletonProps {
  type: 'card' | 'list' | 'banner';
  count?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ type, count = 1 }) => {
  const items = Array.from({ length: count });

  if (type === 'banner') {
    return (
      <div className="w-full h-96 bg-brand-surface animate-pulse rounded-lg border border-brand-border" />
    );
  }

  if (type === 'card') {
    return (
      <div className="flex gap-4 overflow-hidden">
        {items.map((_, i) => (
          <div key={i} className="min-w-[200px] flex flex-col gap-2">
            <div className="h-[280px] w-full bg-brand-surface animate-pulse rounded-md border border-brand-border" />
            <div className="h-4 w-3/4 bg-brand-surface animate-pulse rounded" />
            <div className="h-4 w-1/2 bg-brand-surface animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((_, i) => (
        <div key={i} className="h-12 w-full bg-brand-surface animate-pulse rounded border border-brand-border" />
      ))}
    </div>
  );
};

export default LoadingSkeleton;