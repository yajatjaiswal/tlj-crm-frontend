import React from 'react';

const CustomerTabSkeleton = () => {
  return (
    <div className="col-span-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Basic Information Card Skeleton */}
        <div className="bg-gradient-to-br from-brand-extra-light to-white p-4 rounded-xl border border-brand/25 shadow-sm animate-pulse">
          <div className="flex items-center space-x-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-brand-light"></div>
            <div className="h-4 bg-brand-light rounded w-32"></div>
          </div>
          <div className="space-y-3 grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-brand-light rounded w-16"></div>
                <div className="h-4 bg-brand-light rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Information Card Skeleton */}
        <div className="bg-gradient-to-br from-brand-extra-light to-white p-4 rounded-xl border border-brand/25 shadow-sm animate-pulse">
          <div className="flex items-center space-x-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-brand-light"></div>
            <div className="h-4 bg-brand-light rounded w-36"></div>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="h-3 bg-brand-light rounded w-24"></div>
              <div className="h-4 bg-brand-light rounded w-full"></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 bg-brand-light rounded w-20"></div>
                  <div className="h-4 bg-brand-light rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Identity Information Card Skeleton */}
        <div className="bg-gradient-to-br from-brand-extra-light to-white p-4 rounded-xl border border-brand/25 shadow-sm animate-pulse">
          <div className="flex items-center space-x-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-brand-light"></div>
            <div className="h-4 bg-brand-light rounded w-36"></div>
          </div>
          <div className="space-y-3 grid grid-cols-2 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-brand-light rounded w-20"></div>
                <div className="h-4 bg-brand-light rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Address Information Card Skeleton */}
        <div className="bg-gradient-to-br from-brand-extra-light to-white p-4 rounded-xl border border-brand/25 shadow-sm animate-pulse">
          <div className="flex items-center space-x-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-brand-light"></div>
            <div className="h-4 bg-brand-light rounded w-36"></div>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="h-3 bg-brand-light rounded w-24"></div>
              <div className="h-4 bg-brand-light rounded w-full"></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 bg-brand-light rounded w-16"></div>
                  <div className="h-4 bg-brand-light rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerTabSkeleton; 