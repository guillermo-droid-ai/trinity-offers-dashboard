import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { STATUS_COLORS, STATUS_LABELS } from "../shared/constants";

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, pct } = payload[0].payload;
  return (
    <div className="glass px-3 py-2 text-xs">
      <div className="text-text-primary font-medium">{name}</div>
      <div className="text-text-secondary">{value} ({pct}%)</div>
    </div>
  );
}

export default function StatusBreakdown({ leads }) {
  const statusMap = {};
  leads.forEach(l => {
    const s = l.status || "unknown";
    statusMap[s] = (statusMap[s] || 0) + 1;
  });

  const total = leads.length;
  const chartData = Object.entries(statusMap)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      pct: total > 0 ? ((count / total) * 100).toFixed(1) : "0.0",
      color: STATUS_COLORS[status] || "#6b7280",
    }));

  if (chartData.length === 0) {
    return (
      <div className="glass p-6">
        <h3 className="text-sm font-semibold text-text-secondary mb-4">Status Breakdown</h3>
        <div className="text-text-dim text-sm text-center py-8">No data yet</div>
      </div>
    );
  }

  return (
    <div className="glass p-6">
      <h3 className="text-sm font-semibold text-text-secondary mb-4">Status Breakdown</h3>
      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* Donut Chart */}
        <div className="relative w-48 h-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-text-primary">{total}</div>
            <div className="text-[10px] text-text-muted">total</div>
          </div>
        </div>

        {/* Legend bars */}
        <div className="flex-1 w-full space-y-2.5">
          {chartData.map(entry => (
            <div key={entry.name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary">{entry.name}</span>
                <span className="text-text-muted">{entry.value} ({entry.pct}%)</span>
              </div>
              <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(entry.value / total) * 100}%`,
                    background: entry.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
