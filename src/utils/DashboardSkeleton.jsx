import React from 'react';

const DashboardSkeleton = () => {
    return (
        <div className="max-w-7xl mt-20 mx-auto px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
            {/* Header with Time Period Dropdown Shimmer */}
            <div className="flex justify-between items-center mb-10">
                <div className="h-8 w-48 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg animate-pulse"></div>
                <div className="h-10 w-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg animate-pulse"></div>
            </div>

            {/* Main Stats Grid Shimmer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
                {[...Array(5)].map((_, index) => (
                    <div key={index} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 p-6 hover:shadow-2xl transition-all duration-300">
                        <div className="h-6 w-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg animate-pulse mb-4"></div>
                        <div className="h-12 w-40 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg animate-pulse"></div>
                    </div>
                ))}
            </div>

            {/* Charts and Additional Stats Section Shimmer */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Pie Chart Card Shimmer */}
                <div className="lg:col-span-2">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 p-6 hover:shadow-2xl transition-all duration-300">
                        <div className="h-6 w-48 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg animate-pulse mb-2"></div>
                        <div className="h-4 w-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg animate-pulse mb-6"></div>
                        <div className="h-[400px] w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg animate-pulse"></div>
                    </div>
                </div>

                {/* Additional Stats Shimmer */}
                <div className="space-y-8">
                    {[...Array(2)].map((_, index) => (
                        <div key={index} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 p-6 hover:shadow-2xl transition-all duration-300">
                            <div className="h-6 w-48 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg animate-pulse mb-4"></div>
                            <div className="h-12 w-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg animate-pulse"></div>
                            <div className="h-4 w-40 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg animate-pulse mt-2"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DashboardSkeleton; 