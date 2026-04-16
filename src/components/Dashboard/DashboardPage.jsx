import { useMemo } from "react";
import { isWithinInterval } from "date-fns";
import DateFilter from "../ui/DateFilter";
import StatsGrid from "./StatsGrid";
import StatusBreakdown from "./StatusBreakdown";
import CallsOverTime from "./CallsOverTime";
import { useState } from "react";

export default function DashboardPage({ leads }) {
  const [dateRange, setDateRange] = useState(null);

  const filteredLeads = useMemo(() => {
    if (!dateRange) return leads;
    return leads.filter(l => {
      const created = l.created_at ? new Date(l.created_at) : null;
      if (!created) return false;
      return isWithinInterval(created, { start: dateRange.from, end: dateRange.to });
    });
  }, [leads, dateRange]);

  return (
    <div>
      <div className="mb-6">
        <DateFilter value={dateRange} onChange={setDateRange} />
      </div>

      <StatsGrid leads={leads} filteredLeads={filteredLeads} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <StatusBreakdown leads={filteredLeads} />
        <CallsOverTime leads={filteredLeads} />
      </div>

      {/* Cadence breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CadenceCard
          label="New Leads"
          count={filteredLeads.filter(l => l.cadence_type === "new_lead").length}
          color="#3b82f6"
          bgColor="rgba(59,130,246,0.08)"
          textColor="#93c5fd"
          valueColor="#dbeafe"
        />
        <CadenceCard
          label="Existing Follow-up"
          count={filteredLeads.filter(l => l.cadence_type === "existing_follow_up").length}
          color="#8b5cf6"
          bgColor="rgba(139,92,246,0.08)"
          textColor="#c4b5fd"
          valueColor="#ede9fe"
        />
      </div>
    </div>
  );
}

function CadenceCard({ label, count, color, bgColor, textColor, valueColor }) {
  return (
    <div
      className="glass p-5 border-l-3"
      style={{ borderLeftColor: color, background: bgColor }}
    >
      <div className="text-xs mb-1" style={{ color: textColor }}>{label}</div>
      <div className="text-3xl font-bold" style={{ color: valueColor }}>{count}</div>
    </div>
  );
}
