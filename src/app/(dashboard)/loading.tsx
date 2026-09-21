import React from 'react';
import { PageSkeleton } from '@/components/ui/loading-state';

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <PageSkeleton />
    </div>
  );
}
