import { useState } from "react";
import { Calendar } from "lucide-react";
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, subDays, subWeeks, subMonths,
} from "date-fns";

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 Days" },
  { key: "this_week", label: "This Week" },
  { key: "last_week", label: "Last Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "30d", label: "Last 30 Days" },
  { key: "all", label: "All Time" },
  { key: "custom", label: "Custom" },
];

function getPresetRange(key) {
  const now = new Date();
  switch (key) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "7d":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "this_week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now) };
    case "last_week": {
      const lw = subWeeks(now, 1);
      return { from: startOfWeek(lw, { weekStartsOn: 1 }), to: endOfWeek(lw, { weekStartsOn: 1 }) };
    }
    case "this_month":
      return { from: startOfMonth(now), to: endOfDay(now) };
    case "last_month": {
      const lm = subMonths(now, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
    case "30d":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "all":
      return null;
    default:
      return null;
  }
}

export default function DateFilter({ value, onChange }) {
  const [activePreset, setActivePreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const handlePreset = (key) => {
    setActivePreset(key);
    if (key === "custom") return;
    const range = getPresetRange(key);
    onChange(range);
  };

  const handleCustom = (from, to) => {
    if (from && to) {
      onChange({
        from: startOfDay(new Date(from)),
        to: endOfDay(new Date(to)),
      });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar size={16} className="text-text-muted" />
      <div className="flex flex-wrap gap-1">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => handlePreset(p.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
              activePreset === p.key
                ? 'bg-blue/15 text-blue border-blue/30'
                : 'bg-surface-raised text-text-muted border-border hover:text-text-secondary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {activePreset === "custom" && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={customFrom}
            onChange={e => {
              setCustomFrom(e.target.value);
              handleCustom(e.target.value, customTo);
            }}
            className="px-3 py-1.5 bg-surface-raised border border-border-strong rounded-lg text-xs text-text-primary outline-none"
          />
          <span className="text-text-muted text-xs">to</span>
          <input
            type="date"
            value={customTo}
            onChange={e => {
              setCustomTo(e.target.value);
              handleCustom(customFrom, e.target.value);
            }}
            className="px-3 py-1.5 bg-surface-raised border border-border-strong rounded-lg text-xs text-text-primary outline-none"
          />
        </div>
      )}
    </div>
  );
}
