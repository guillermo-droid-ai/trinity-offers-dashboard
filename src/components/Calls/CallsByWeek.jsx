import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getISOWeek, getISOWeekYear } from "date-fns";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-3 py-2 text-xs">
      <div className="text-text-primary font-medium">{label}</div>
      <div className="text-purple">{payload[0].value} calls</div>
    </div>
  );
}

export default function CallsByWeek({ leads }) {
  const calledLeads = leads.filter(l => l.last_called_at && l.call_count > 0);

  const weekMap = {};
  calledLeads.forEach(l => {
    const d = new Date(l.last_called_at);
    const week = getISOWeek(d);
    const year = getISOWeekYear(d);
    const key = `${year}-W${String(week).padStart(2, "0")}`;
    weekMap[key] = (weekMap[key] || 0) + 1;
  });

  const chartData = Object.entries(weekMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12) // last 12 weeks
    .map(([week, count]) => ({
      week: `Wk ${week.split("-W")[1]}`,
      calls: count,
    }));

  if (chartData.length === 0) {
    return (
      <div className="glass p-6">
        <h3 className="text-sm font-semibold text-text-secondary mb-4">Calls per Week</h3>
        <div className="h-64 flex items-center justify-center text-text-dim text-sm">
          No call data available
        </div>
      </div>
    );
  }

  return (
    <div className="glass p-6">
      <h3 className="text-sm font-semibold text-text-secondary mb-4">Calls per Week</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={24}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="week"
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="calls" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
