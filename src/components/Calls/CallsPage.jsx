import { useState, useMemo } from "react";
import { isWithinInterval } from "date-fns";
import { Phone, Voicemail, CalendarCheck } from "lucide-react";
import DateFilter from "../ui/DateFilter";
import DataTable from "../ui/DataTable";
import KpiCard from "../ui/KpiCard";
import StatusBadge from "../ui/StatusBadge";
import CallsByDay from "./CallsByDay";
import CallsByWeek from "./CallsByWeek";

const COLUMNS = [
  {
    key: "name",
    label: "Name",
    render: (row) => (
      <span className="text-text-primary">{row.first_name || row.name || "\u2014"}</span>
    ),
  },
  {
    key: "phone",
    label: "Phone",
    render: (row) => (
      <span className="font-mono text-xs text-text-secondary">{row.phone}</span>
    ),
  },
  { key: "status", label: "Status" },
  {
    key: "call_count",
    label: "Calls",
    render: (row) => <span className="text-text-secondary">{row.call_count || 0}</span>,
  },
  {
    key: "last_called_at",
    label: "Last Called",
    render: (row) => (
      <span className="text-xs text-text-muted">
        {row.last_called_at
          ? new Date(row.last_called_at).toLocaleString("en-US", {
              month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
            })
          : "\u2014"}
      </span>
    ),
  },
  {
    key: "cadence_type",
    label: "Cadence",
    render: (row) => (
      <span className="text-xs text-text-muted">
        {row.cadence_type === "new_lead" ? "New" : "Follow-up"}
      </span>
    ),
  },
  {
    key: "retell_call_id",
    label: "Call ID",
    sortable: false,
    render: (row) => (
      <span className="font-mono text-[10px] text-text-dim">
        {row.retell_call_id ? row.retell_call_id.substring(0, 16) + "..." : "\u2014"}
      </span>
    ),
  },
];

export default function CallsPage({ leads }) {
  const [dateRange, setDateRange] = useState(null);

  const calledLeads = useMemo(() => {
    return leads
      .filter(l => l.last_called_at && l.call_count > 0)
      .sort((a, b) => new Date(b.last_called_at) - new Date(a.last_called_at));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    if (!dateRange) return calledLeads;
    return calledLeads.filter(l => {
      const called = new Date(l.last_called_at);
      return isWithinInterval(called, { start: dateRange.from, end: dateRange.to });
    });
  }, [calledLeads, dateRange]);

  const today = new Date().toISOString().split("T")[0];
  const calledToday = filteredLeads.filter(l => l.last_called_at.startsWith(today)).length;
  const voicemails = filteredLeads.filter(l => l.status === "voicemail").length;
  const appointments = filteredLeads.filter(l => l.status === "appointment_set").length;

  return (
    <div>
      <div className="mb-6">
        <DateFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <KpiCard label="Total Called" value={filteredLeads.length} color="#3b82f6" icon={Phone} />
        <KpiCard label="Called Today" value={calledToday} color="#10b981" icon={Phone} />
        <KpiCard label="Voicemails" value={voicemails} color="#8b5cf6" icon={Voicemail} />
        <KpiCard label="Appointments" value={appointments} color="#10b981" icon={CalendarCheck} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <CallsByDay leads={filteredLeads} dateRange={dateRange} />
        <CallsByWeek leads={filteredLeads} />
      </div>

      <div className="glass p-6">
        <h3 className="text-sm font-semibold text-text-secondary mb-4">Call Log</h3>
        <DataTable
          data={filteredLeads}
          columns={COLUMNS}
          searchFields={["first_name", "name", "phone"]}
          defaultSort={{ key: "last_called_at", dir: "desc" }}
        />
      </div>
    </div>
  );
}
