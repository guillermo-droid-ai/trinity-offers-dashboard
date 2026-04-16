import { useState, useMemo } from "react";
import { isWithinInterval } from "date-fns";
import { RefreshCw, Clock, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import DateFilter from "../ui/DateFilter";
import DataTable from "../ui/DataTable";
import KpiCard from "../ui/KpiCard";
import { STATUS_COLORS, STATUS_LABELS } from "../shared/constants";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-3 py-2 text-xs">
      <div className="text-text-primary font-medium">{label}</div>
      <div className="text-purple">{payload[0].value} leads</div>
    </div>
  );
}

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
    key: "current_week",
    label: "Week",
    render: (row) => <span className="text-text-secondary">{row.current_week || "\u2014"}</span>,
  },
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
    key: "next_call_at",
    label: "Next Call",
    render: (row) => {
      const isOverdue = row.next_call_at && new Date(row.next_call_at) <= new Date()
        && ["pending", "no_answer", "voicemail"].includes(row.status);
      return (
        <span className={`text-xs ${isOverdue ? 'text-red font-medium' : 'text-text-muted'}`}>
          {row.next_call_at
            ? new Date(row.next_call_at).toLocaleString("en-US", {
                month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
              })
            : "\u2014"}
          {isOverdue && " (overdue)"}
        </span>
      );
    },
  },
];

export default function FollowUpsPage({ leads, onDelete }) {
  const [dateRange, setDateRange] = useState(null);

  const followUpLeads = useMemo(() => {
    return leads.filter(l => l.cadence_type === "existing_follow_up");
  }, [leads]);

  const filteredLeads = useMemo(() => {
    if (!dateRange) return followUpLeads;
    return followUpLeads.filter(l => {
      const date = l.last_called_at ? new Date(l.last_called_at) : l.created_at ? new Date(l.created_at) : null;
      if (!date) return false;
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });
  }, [followUpLeads, dateRange]);

  // Status breakdown chart for follow-ups
  const statusChartData = useMemo(() => {
    const map = {};
    filteredLeads.forEach(l => {
      const s = l.status || "unknown";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        count,
        color: STATUS_COLORS[status] || "#6b7280",
      }));
  }, [filteredLeads]);

  const overdue = filteredLeads.filter(l =>
    l.next_call_at && new Date(l.next_call_at) <= new Date() &&
    ["pending", "no_answer", "voicemail"].includes(l.status)
  ).length;

  const active = filteredLeads.filter(l =>
    ["pending", "no_answer", "voicemail"].includes(l.status)
  ).length;

  return (
    <div>
      <div className="mb-6">
        <DateFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <KpiCard label="Follow-Up Leads" value={filteredLeads.length} color="#8b5cf6" icon={RefreshCw} />
        <KpiCard label="Active" value={active} color="#3b82f6" icon={Clock} />
        <KpiCard label="Overdue" value={overdue} color="#ef4444" icon={AlertTriangle} />
      </div>

      {/* Status breakdown chart */}
      {statusChartData.length > 0 && (
        <div className="glass p-6 mb-6">
          <h3 className="text-sm font-semibold text-text-secondary mb-4">Follow-Up Status Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} barSize={28} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {statusChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="glass p-6">
        <h3 className="text-sm font-semibold text-text-secondary mb-4">Follow-Up Details</h3>
        <DataTable
          data={filteredLeads}
          columns={COLUMNS}
          searchFields={["first_name", "name", "phone"]}
          defaultSort={{ key: "next_call_at", dir: "asc" }}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
