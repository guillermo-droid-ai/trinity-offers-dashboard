import { RefreshCw } from "lucide-react";

export default function Header({ title, loading, lastRefresh, onRefresh, staleReset, onDismissStale }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-text-primary">{title}</h2>
        <div className="flex items-center gap-3">
          {loading && (
            <span className="text-xs text-amber animate-pulse">refreshing...</span>
          )}
          {lastRefresh && (
            <span className="text-xs text-text-dim">{lastRefresh.toLocaleTimeString()}</span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium
              transition-all cursor-pointer border
              ${loading
                ? 'bg-surface-raised border-border text-text-dim cursor-wait'
                : 'bg-blue/12 border-blue/25 text-blue hover:bg-blue/20'
              }
            `}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading' : 'Refresh'}
          </button>
        </div>
      </div>

      {staleReset > 0 && (
        <div className="mt-3 flex items-center justify-between px-4 py-2.5 rounded-xl text-xs bg-amber/10 border border-amber/25 text-amber-300">
          <span>
            Auto-reset {staleReset} stale "calling" lead{staleReset > 1 ? 's' : ''} to "no_answer" (stuck &gt;10min)
          </span>
          <button
            onClick={onDismissStale}
            className="text-amber hover:text-amber-300 cursor-pointer p-1"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
