import { useState, useMemo } from "react";
import { isWithinInterval, format, eachDayOfInterval, subDays } from "date-fns";
import { UserPlus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import DateFilter from "../ui/DateFilter";
import DataTable from "../ui/DataTable";
import KpiCard from "../ui/KpiCard";
import StatusBadge from "../ui/StatusBadge";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-3 py-2 text-xs">
      <div className="text-text-primary font-medium">{label}</div>
      <div className="text-green">{payload[0].value} new leads</div>
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
    key: "cadence_type",
    label: "Cadence",
    render: (row) => (
      <span className="text-xs text-text-muted">
        {row.cadence_type === "new_lead" ? "New" : "Follow-up"}
      </span>
    ),
  },
  {
    key: "call_count",
    label: "Calls",
    render: (row) => <span className="text-text-secondary">{row.call_count || 0}</span>,
  },
  {
    key: "created_at",
    label: "Created",
    render: (row) => (
      <span className="text-xs text-text-muted">
        {row.created_at
          ? new Date(row.created_at).toLocaleString("en-US", {
              month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
            })
          : "\u2014"}
      </span>
    ),
  },
  {
    key: "next_call_at",
    label: "Next Call",
    render: (row) => (
      <span className="text-xs text-text-muted">
        {row.next_call_at
          ? new Date(row.next_call_at).toLocaleString("en-US", {
              month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
            })
          : "\u2014"}
      </span>
    ),
  },
];

export default function NewLeadsPage({ leads }) {
  const [dateRange, setDateRange] = useState(null);

  const filteredLeads = useMemo(() => {
    let result = leads.filter(l => l.created_at);
    if (dateRange) {
      result = result.filter(l =>
        isWithinInterval(new Date(l.created_at), { start: dateRange.from, end: dateRange.to })
      );
    }
    return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [leads, dateRange]);

  // Chart: new leads per day
  const chartData = useMemo(() => {
    let days;
    if (dateRange) {
      days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    } else {
      const end = new Date();
      const start = subDays(end, 29);
      days = eachDayOfInterval({ start, end });
    }

    const buckets = {};
    days.forEach(d => { buckets[format(d, "yyyy-MM-dd")] = 0; });

    filteredLeads.forEach(l => {
      if (!l.created_at) return;
      const day = l.created_at.substring(0, 10);
      if (buckets[day] !== undefined) buckets[day]++;
    });

    return Object.entries(buckets).map(([date, count]) => ({
      date: format(new Date(date), "MMM d"),
      leads: count,
    }));
  }, [filteredLeads, dateRange]);

  const today = new Date().toISOString().split("T")[0];
  const newToday = filteredLeads.filter(l => l.created_at && l.created_at.startsWith(today)).length;
  const newLeadCadence = filteredLeads.filter(l => l.cadence_type === "new_lead").length;

  return (
    <div>
      <div className="mb-6">
        <DateFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <KpiCard label="Total New Leads" value={filteredLeads.length} color="#10b981" icon={UserPlus} />
        <KpiCard label="New Today" value={newToday} color="#3b82f6" icon={UserPlus} />
        <KpiCard label="New Lead Cadence" value={newLeadCadence} color="#8b5cf6" icon={UserPlus} />
      </div>

      {/* New Leads per Day chart */}
      <div className="glass p-6 mb-6">
        <h3 className="text-sm font-semibold text-text-secondary mb-4">New Leads per Day</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                tickLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 10) - 1)}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="leads" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass p-6">
        <h3 className="text-sm font-semibold text-text-secondary mb-4">Lead Details</h3>
        <DataTable
          data={filteredLeads}
          columns={COLUMNS}
          searchFields={["first_name", "name", "phone"]}
          defaultSort={{ key: "created_at", dir: "desc" }}
        />
      </div>
    </div>
  );
}
