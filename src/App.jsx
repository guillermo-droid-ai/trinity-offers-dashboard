import { useState } from "react";
import { useLeads } from "./hooks/useLeads";
import Sidebar from "./components/Layout/Sidebar";
import Header from "./components/Layout/Header";
import DashboardPage from "./components/Dashboard/DashboardPage";
import CallsPage from "./components/Calls/CallsPage";
import NewLeadsPage from "./components/Leads/NewLeadsPage";
import FollowUpsPage from "./components/Leads/FollowUpsPage";

const PAGE_TITLES = {
  dashboard: "Overview",
  calls: "Calls",
  "new-leads": "New Leads",
  "follow-ups": "Follow-Ups",
};

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { leads, loading, error, lastRefresh, staleReset, dismissStaleReset, refresh, deleteLeads } = useLeads();

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 lg:ml-0 p-6 lg:p-8 pt-16 lg:pt-8">
        <Header
          title={PAGE_TITLES[activeTab]}
          loading={loading}
          lastRefresh={lastRefresh}
          onRefresh={refresh}
          staleReset={staleReset}
          onDismissStale={dismissStaleReset}
        />

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl text-sm bg-red/10 border border-red/25 text-red-300">
            {error}
          </div>
        )}

        {loading && leads.length === 0 ? (
          <LoadingSkeleton />
        ) : (
          <>
            {activeTab === "dashboard" && <DashboardPage leads={leads} onDelete={deleteLeads} />}
            {activeTab === "calls" && <CallsPage leads={leads} onDelete={deleteLeads} />}
            {activeTab === "new-leads" && <NewLeadsPage leads={leads} onDelete={deleteLeads} />}
            {activeTab === "follow-ups" && <FollowUpsPage leads={leads} onDelete={deleteLeads} />}
          </>
        )}
      </main>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI cards skeleton */}
      <div className="flex flex-wrap gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="glass flex-1 basis-44 min-w-40 p-6 h-24">
            <div className="h-3 w-20 bg-surface-hover rounded mb-3" />
            <div className="h-8 w-16 bg-surface-hover rounded" />
          </div>
        ))}
      </div>
      {/* Chart skeletons */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass p-6 h-80">
          <div className="h-3 w-32 bg-surface-hover rounded mb-4" />
          <div className="h-full bg-surface-hover rounded-lg" />
        </div>
        <div className="glass p-6 h-80">
          <div className="h-3 w-32 bg-surface-hover rounded mb-4" />
          <div className="h-full bg-surface-hover rounded-lg" />
        </div>
      </div>
    </div>
  );
}
