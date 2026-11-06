import { AlertTriangle, AlertCircle } from "lucide-react";

export const ErrorState = ({ error }) => {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-card border border-border rounded-xl p-6 flex items-start gap-4 shadow-lg">
          <div className="p-2 bg-red-600 rounded-lg">
            <AlertTriangle className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-foreground font-medium text-lg">
              Error
            </h3>
            <p className="text-muted mt-2">
              {error || "An unexpected error occurred. Please try again later."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-brand text-brand-foreground hover:bg-brand-hover rounded-lg transition-all duration-200 font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EmptyState = ({ tableName }) => {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-card rounded-xl border border-border p-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-elevated border border-border rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-muted" size={32} />
          </div>
          <h3 className="text-2xl font-semibold text-foreground mb-2">
            No {tableName} Found
          </h3>
          <p className="text-muted text-sm">
            Try changing your filters or search criteria.
          </p>
        </div>
      </div>
    </div>
  );
};
