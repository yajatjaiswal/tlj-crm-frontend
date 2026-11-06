import React from "react";

/**
 * Layout component for admin dashboard pages
 */
const DashboardLayout = ({ children }) => (
  <div className="min-h-screen w-full bg-slate-50 text-slate-900">
    <div className="w-full overflow-hidden">
      <main className="w-full overflow-y-auto">
        <div className="mx-auto w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="">{children}</div>
        </div>
      </main>
    </div>
  </div>
);

export default DashboardLayout; 