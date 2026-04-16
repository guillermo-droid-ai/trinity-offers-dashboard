import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-3 py-2 text-xs">
      <div className="text-text-primary font-medium">{label}</div>
      <div className="text-blue">{payload[0].value} calls</div>
    </div>
  );
}

export default function CallsOverTime({ leads, days = 14 }) {
  const now = new Date();
  const buckets = {};

  // Initialize all days
  for (let i = days - 1; i >= 0; i--) {
    const d = format(subDays(now, i), "yyyy-MM-dd");
    buckets[d] = 0;
  }

  // Count calls per day
  leads.forEach(l => {
    if (!l.last_called_at) return;
    const day = l.last_called_at.substring(0, 10);
    if (buckets[day] !== undefined) {
      buckets[day]++;
    }
  });

  const chartData = Object.entries(buckets).map(([date, count]) => ({
    date: format(new Date(date), "MMM d"),
    calls: count,
  }));

  return (
    <div className="glass p-6">
      <h3 className="text-sm font-semibold text-text-secondary mb-4">
        Calls — Last {days} Days
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
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
            <Bar dataKey="calls" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
