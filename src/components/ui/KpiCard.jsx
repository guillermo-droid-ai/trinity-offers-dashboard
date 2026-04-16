export default function KpiCard({ label, value, sub, color = "#f0f0f0", icon: Icon, trend }) {
  return (
    <div className="glass flex-1 basis-44 min-w-40 p-6 relative overflow-hidden group">
      {/* Accent left border */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full" style={{ background: color }} />

      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-text-secondary uppercase tracking-wider mb-2">{label}</div>
          <div className="text-3xl font-bold leading-none" style={{ color }}>{value}</div>
          {sub && <div className="text-xs text-text-muted mt-1.5">{sub}</div>}
        </div>
        {Icon && (
          <div className="p-2 rounded-lg" style={{ background: `${color}15` }}>
            <Icon size={20} style={{ color }} />
          </div>
        )}
      </div>

      {trend !== undefined && trend !== null && (
        <div className={`text-xs mt-2 flex items-center gap-1 ${trend >= 0 ? 'text-green' : 'text-red'}`}>
          <span>{trend >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(trend)}% vs last period</span>
        </div>
      )}
    </div>
  );
}
